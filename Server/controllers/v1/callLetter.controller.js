import crypto from "crypto";
import CallLetter from "../../models/CallLetter.js";
import UsedToken from "../../models/UsedToken.js";
import Candidate from "../../models/Candidate.js";
import Application from "../../models/Application.js";
import FeePayment from "../../models/FeePayment.js";
import Advertisement from "../../models/Advertisement.js";
import { generateCallLetterPdf } from "../../services/callLetterPdf.service.js";
import { sendTemplatedEmail } from "../../services/email.service.js";

const TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes
const DELAY_MS = 300;

const signToken = (payload) => {
  const secret = process.env.CALL_LETTER_TOKEN_SECRET;
  const data = JSON.stringify(payload);
  const sig = crypto.createHmac("sha256", secret).update(data).digest("hex");
  return Buffer.from(JSON.stringify({ d: data, s: sig })).toString("base64url");
};

const verifyToken = (token) => {
  try {
    const secret = process.env.CALL_LETTER_TOKEN_SECRET;
    if (!secret) return null;
    const { d, s } = JSON.parse(Buffer.from(token, "base64url").toString());
    const expected = crypto
      .createHmac("sha256", secret)
      .update(d)
      .digest("hex");
    const eBuf = Buffer.from(expected, "hex");
    const sBuf = Buffer.from(s, "hex");
    if (eBuf.length !== sBuf.length || !crypto.timingSafeEqual(eBuf, sBuf))
      return null;
    const payload = JSON.parse(d);
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
};

const tokenHash = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

// ── Public ────────────────────────────────────────────────────────────────────

export const checkEligibility = async (req, res) => {
  const start = Date.now();
  const respond = (status, body) => {
    const wait = Math.max(0, DELAY_MS - (Date.now() - start));
    setTimeout(() => res.status(status).json(body), wait);
  };

  try {
    const { registration_id, dob, advt_no } = req.body;
    if (!registration_id || !dob || !advt_no)
      return respond(422, {
        isOk: false,
        status: 422,
        message: "registration_id, dob, and advt_no are required",
      });

    // Validate registration_id + DOB together (enumeration prevention)
    const candidate = await Candidate.findOne({
      registration_id,
      dob: new Date(dob),
    }).select("registration_id");
    if (!candidate)
      return respond(200, {
        isOk: true,
        status: 200,
        eligible: false,
        reason: "application_not_found",
      });

    // Condition 1: Application exists
    const app = await Application.findOne({ registration_id, advt_no });
    if (!app)
      return respond(200, {
        isOk: true,
        status: 200,
        eligible: false,
        reason: "application_not_found",
      });

    // Condition 2: Fee paid
    const fee = await FeePayment.findOne({
      application_ref_no: app.application_ref_no,
      status: "paid",
    });
    if (!fee)
      return respond(200, {
        isOk: true,
        status: 200,
        eligible: false,
        reason: "fee_not_paid",
      });

    // Conditions 3 & 4: enabled + available_from
    const cl = await CallLetter.findOne({ registration_id, advt_no });
    if (!cl || !cl.enabled)
      return respond(200, {
        isOk: true,
        status: 200,
        eligible: false,
        reason: "not_yet_released",
      });
    if (cl.available_from && new Date() < cl.available_from)
      return respond(200, {
        isOk: true,
        status: 200,
        eligible: false,
        reason: "not_yet_released",
      });

    const token = signToken({
      registration_id,
      advt_no,
      exp: Date.now() + TOKEN_TTL_MS,
    });
    return respond(200, { isOk: true, status: 200, eligible: true, token });
  } catch (error) {
    return respond(500, { isOk: false, status: 500, message: error.message });
  }
};

// Token-gated download — no session required
export const downloadCallLetter = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token)
      return res
        .status(401)
        .json({ isOk: false, status: 401, message: "Token required" });

    const payload = verifyToken(token);
    if (!payload)
      return res.status(401).json({
        isOk: false,
        status: 401,
        message: "Invalid or expired token",
      });

    const { registration_id, advt_no } = payload;

    // Single-use: insert fails with duplicate key if token already consumed
    try {
      await UsedToken.create({ token_hash: tokenHash(token) });
    } catch {
      return res
        .status(401)
        .json({ isOk: false, status: 401, message: "Token already used" });
    }

    // Re-verify all 4 conditions at download time
    const [app, cl, candidate, advt] = await Promise.all([
      Application.findOne({ registration_id, advt_no }),
      CallLetter.findOne({ registration_id, advt_no }),
      Candidate.findOne({ registration_id })
        .select("-password -aadhaar_hash -login_attempts -lockout_until")
        .populate("category", "label code")
        .lean(),
      Advertisement.findOne({ advt_no }).lean(),
    ]);

    if (!app || !cl || !cl.enabled)
      return res
        .status(403)
        .json({ isOk: false, status: 403, message: "Not eligible" });
    if (cl.available_from && new Date() < cl.available_from)
      return res
        .status(403)
        .json({ isOk: false, status: 403, message: "Not yet released" });

    const fee = await FeePayment.findOne({
      application_ref_no: app.application_ref_no,
      status: "paid",
    });
    if (!fee)
      return res
        .status(403)
        .json({ isOk: false, status: 403, message: "Fee not paid" });

    if (!cl.downloaded_at) {
      cl.downloaded_at = new Date();
      await cl.save();
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="admit-card-${registration_id}-${advt_no.replace(/\//g, "-")}.pdf"`,
    );

    await generateCallLetterPdf(
      { callLetter: cl.toObject(), candidate, advertisement: advt },
      res,
    );
  } catch (error) {
    if (!res.headersSent)
      return res
        .status(500)
        .json({ isOk: false, status: 500, message: error.message });
  }
};

// Returns all enabled+available call letters for a registration_id+dob pair
export const listCallLetters = async (req, res) => {
  const start = Date.now();
  const respond = (status, body) => {
    const wait = Math.max(0, DELAY_MS - (Date.now() - start));
    setTimeout(() => res.status(status).json(body), wait);
  };

  try {
    const { registration_id, dob } = req.body;
    if (!registration_id || !dob)
      return respond(422, {
        isOk: false,
        status: 422,
        message: "registration_id and dob are required",
      });

    const candidate = await Candidate.findOne({
      registration_id,
      dob: new Date(dob),
    }).select("registration_id");
    if (!candidate) return respond(200, { isOk: true, status: 200, data: [] });

    const now = new Date();
    const callLetters = await CallLetter.find({
      registration_id,
      enabled: true,
      $or: [{ available_from: null }, { available_from: { $lte: now } }],
    }).lean();

    if (!callLetters.length)
      return respond(200, { isOk: true, status: 200, data: [] });

    const advtNos = callLetters.map((cl) => cl.advt_no);
    const [apps, advertisements] = await Promise.all([
      Application.find({ registration_id, advt_no: { $in: advtNos } }).lean(),
      Advertisement.find({ advt_no: { $in: advtNos } })
        .select("advt_no post_title")
        .lean(),
    ]);

    const appByAdvt = Object.fromEntries(apps.map((a) => [a.advt_no, a]));
    const advtByNo = Object.fromEntries(
      advertisements.map((a) => [a.advt_no, a]),
    );

    const refNos = apps.map((a) => a.application_ref_no);
    const paidFees = await FeePayment.find({
      application_ref_no: { $in: refNos },
      status: "paid",
    })
      .select("application_ref_no")
      .lean();
    const paidRefs = new Set(paidFees.map((f) => f.application_ref_no));

    const results = callLetters
      .filter((cl) => {
        const app = appByAdvt[cl.advt_no];
        return app && paidRefs.has(app.application_ref_no);
      })
      .map((cl) => ({
        advt_no: cl.advt_no,
        post_title: advtByNo[cl.advt_no]?.post_title || cl.advt_no,
        roll_number: cl.roll_number,
        exam_date: cl.exam_date,
        exam_time: cl.exam_time,
        venue: cl.venue,
        enabled: true,
      }));

    return respond(200, { isOk: true, status: 200, data: results });
  } catch (error) {
    return respond(500, { isOk: false, status: 500, message: error.message });
  }
};

// ── Admin ─────────────────────────────────────────────────────────────────────

export const getCallLetterSettings = async (req, res) => {
  try {
    const { advt_no } = req.params;
    const [settings, rollNumberCount] = await Promise.all([
      CallLetter.findOne({ registration_id: "__settings__", advt_no }).lean(),
      CallLetter.countDocuments({
        advt_no,
        registration_id: { $ne: "__settings__" },
      }),
    ]);
    return res
      .status(200)
      .json({
        isOk: true,
        status: 200,
        data: { settings: settings || null, rollNumberCount },
      });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

export const patchCallLetter = async (req, res) => {
  try {
    const { advt_no } = req.params;
    const {
      enabled,
      available_from,
      exam_date,
      exam_time,
      venue,
      reporting_instructions,
    } = req.body;

    const update = {};
    if (enabled !== undefined) update.enabled = enabled;
    if (available_from !== undefined)
      update.available_from = new Date(available_from);
    if (exam_date !== undefined) update.exam_date = new Date(exam_date);
    if (exam_time !== undefined) update.exam_time = exam_time;
    if (venue !== undefined) update.venue = venue;
    if (reporting_instructions !== undefined)
      update.reporting_instructions = reporting_instructions;

    // Always persist settings to a sentinel record so preview/upload can read them
    await CallLetter.updateOne(
      { registration_id: "__settings__", advt_no },
      { $set: update },
      { upsert: true },
    );
    // Apply to all real candidate records too
    const result = await CallLetter.updateMany(
      { advt_no, registration_id: { $ne: "__settings__" } },
      { $set: update },
    );

    // Fire-and-forget bulk notification when call letters are enabled
    if (update.enabled === true) {
      setImmediate(async () => {
        try {
          const callLetters = await CallLetter.find({
            advt_no,
            enabled: true,
            registration_id: { $ne: "__settings__" },
          })
            .select("registration_id")
            .lean();
          for (const cl of callLetters) {
            const candidate = await Candidate.findOne({
              registration_id: cl.registration_id,
            })
              .select("email name registration_id")
              .lean();
            if (!candidate?.email) continue;
            sendTemplatedEmail("call_letter_published", candidate.email, {
              NAME: candidate.name,
              REGISTRATION_ID: candidate.registration_id,
              ADVT_NO: advt_no,
              PORTAL_URL: process.env.PORTAL_URL || "",
            }).catch((err) =>
              console.error("[EMAIL] call_letter_published:", err.message),
            );
          }
        } catch (err) {
          console.error("[EMAIL] call_letter_published bulk:", err.message);
        }
      });
    }

    return res.status(200).json({
      isOk: true,
      status: 200,
      message: "Call letters updated",
      data: { matched: result.matchedCount, modified: result.modifiedCount },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

export const uploadRollNumbers = async (req, res) => {
  try {
    const { advt_no } = req.params;
    if (!req.file)
      return res
        .status(422)
        .json({ isOk: false, status: 422, message: "CSV file required" });

    const lines = req.file.buffer
      .toString("utf8")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const dataLines = lines[0].toLowerCase().startsWith("registration_id")
      ? lines.slice(1)
      : lines;
    if (!dataLines.length)
      return res
        .status(422)
        .json({ isOk: false, status: 422, message: "CSV has no data rows" });

    const rows = [];
    const parseErrors = [];
    for (let i = 0; i < dataLines.length; i++) {
      const parts = dataLines[i].split(",");
      if (parts.length < 2) {
        parseErrors.push({ row: i + 2, error: "Missing columns" });
        continue;
      }
      rows.push({
        row: i + 2,
        registration_id: parts[0].trim(),
        roll_number: parts[1].trim(),
      });
    }

    if (parseErrors.length)
      return res.status(422).json({
        isOk: false,
        status: 422,
        message: "CSV parse errors",
        errors: parseErrors,
      });

    const regIds = rows.map((r) => r.registration_id);

    const [candidates, paidFees] = await Promise.all([
      Candidate.find({ registration_id: { $in: regIds } })
        .select("registration_id")
        .lean(),
      FeePayment.find({
        advt_no,
        status: "paid",
        registration_id: { $in: regIds },
      })
        .select("registration_id")
        .lean(),
    ]);

    const validRegIds = new Set(candidates.map((c) => c.registration_id));
    const paidRegIds = new Set(paidFees.map((f) => f.registration_id));

    const rollNums = rows.map((r) => r.roll_number);
    const duplicateRolls = [
      ...new Set(rollNums.filter((rn, i) => rollNums.indexOf(rn) !== i)),
    ];

    const errors = [
      ...rows
        .filter((r) => !validRegIds.has(r.registration_id))
        .map((r) => ({
          row: r.row,
          registration_id: r.registration_id,
          error: "Candidate not found",
        })),
      ...rows
        .filter(
          (r) =>
            validRegIds.has(r.registration_id) &&
            !paidRegIds.has(r.registration_id),
        )
        .map((r) => ({
          row: r.row,
          registration_id: r.registration_id,
          error: "Fee not paid",
        })),
      ...(duplicateRolls.length
        ? [{ error: `Duplicate roll numbers: ${duplicateRolls.join(", ")}` }]
        : []),
    ];

    if (errors.length)
      return res.status(422).json({
        isOk: false,
        status: 422,
        message: "Validation failed",
        errors,
      });

    const ops = rows.map((r) => ({
      updateOne: {
        filter: { registration_id: r.registration_id, advt_no },
        update: { $set: { roll_number: r.roll_number } },
        upsert: true,
      },
    }));
    const result = await CallLetter.bulkWrite(ops);

    return res.status(200).json({
      isOk: true,
      status: 200,
      message: "Roll numbers uploaded",
      data: { upserted: result.upsertedCount, modified: result.modifiedCount },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

export const previewCallLetter = async (req, res) => {
  try {
    const { advt_no } = req.params;
    const { exam_date, exam_time, venue, reporting_instructions } =
      req.body || {};
    const hasOverride =
      exam_date || exam_time || venue || reporting_instructions;

    const [advt, existingCl] = await Promise.all([
      Advertisement.findOne({ advt_no }).lean(),
      hasOverride
        ? Promise.resolve(null)
        : CallLetter.findOne({
            registration_id: "__settings__",
            advt_no,
          }).lean(),
    ]);

    const sampleCl = {
      advt_no,
      roll_number: "SAMPLE-001",
      exam_date: exam_date
        ? new Date(exam_date)
        : existingCl?.exam_date || new Date(),
      exam_time: exam_time || existingCl?.exam_time || "10:00 AM",
      venue: venue || existingCl?.venue || "[Venue to be announced]",
      reporting_instructions:
        reporting_instructions ||
        existingCl?.reporting_instructions ||
        "[Reporting instructions to be added]",
    };
    const sampleCandidate = {
      name: "Sample Candidate",
      registration_id: "OTR20240000001",
      dob: new Date("1995-01-01"),
      category: { label: "General" },
    };

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="preview-${advt_no.replace(/\//g, "-")}.pdf"`,
    );

    await generateCallLetterPdf(
      { callLetter: sampleCl, candidate: sampleCandidate, advertisement: advt },
      res,
    );
  } catch (error) {
    if (!res.headersSent)
      return res
        .status(500)
        .json({ isOk: false, status: 500, message: error.message });
  }
};

// Legacy
export const searchCallLetters = async (req, res) => {
  try {
    const {
      skip = 0,
      per_page = 10,
      advt_no,
      enabled,
      sorton,
      sortdir,
    } = req.body;
    const matchCond = {};
    if (advt_no) matchCond.advt_no = advt_no;
    if (enabled !== undefined) matchCond.enabled = enabled;

    const pipeline = [
      { $match: matchCond },
      { $sort: { [sorton || "createdAt"]: sortdir === "asc" ? 1 : -1 } },
      {
        $facet: {
          stage1: [{ $group: { _id: null, count: { $sum: 1 } } }],
          stage2: [{ $skip: skip }, { $limit: per_page }],
        },
      },
      { $unwind: { path: "$stage1", preserveNullAndEmptyArrays: true } },
      {
        $project: { count: { $ifNull: ["$stage1.count", 0] }, data: "$stage2" },
      },
    ];

    const result = await CallLetter.aggregate(pipeline);
    return res.status(200).json({ isOk: true, status: 200, data: result });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};
