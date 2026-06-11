import Application from "../../models/Application.js";
import Advertisement from "../../models/Advertisement.js";
import Candidate from "../../models/Candidate.js";
import { generateApplicationPdf } from "../../services/applicationPdf.service.js";
import { sendTemplatedEmail } from "../../services/email.service.js";

const EDITABLE_FIELDS = [
  "exam_centre",
  "declaration_accepted",
  "experience_years",
  "additional_fields",
];

// ── Strict input validation (public-facing API can be called directly) ───────
const ADVT_NO_RE = /^[A-Z]{2,6}\/\d{4}\/\d{1,8}$/;

const validateSubmissionInput = (body) => {
  const {
    advt_no,
    exam_centre,
    declaration_accepted,
    experience_years,
    additional_fields,
  } = body || {};

  if (typeof advt_no !== "string" || !ADVT_NO_RE.test(advt_no.trim()))
    return "A valid advt_no is required";
  if (
    exam_centre !== undefined &&
    (typeof exam_centre !== "string" || exam_centre.length > 120)
  )
    return "exam_centre must be a string of at most 120 characters";
  if (
    declaration_accepted !== undefined &&
    typeof declaration_accepted !== "boolean"
  )
    return "declaration_accepted must be a boolean";
  if (
    experience_years !== undefined &&
    (typeof experience_years !== "number" ||
      Number.isNaN(experience_years) ||
      experience_years < 0 ||
      experience_years > 60)
  )
    return "experience_years must be a number between 0 and 60";
  if (additional_fields !== undefined) {
    if (
      typeof additional_fields !== "object" ||
      additional_fields === null ||
      Array.isArray(additional_fields)
    )
      return "additional_fields must be an object";
    if (JSON.stringify(additional_fields).length > 5000)
      return "additional_fields is too large";
  }
  return null;
};

// Strip HTML/script characters from free-text values
const sanitizeText = (v) =>
  typeof v === "string" ? v.trim().replace(/[<>]/g, "").slice(0, 500) : v;

// The deadline is midnight at the END of end_date's day: an ad ending
// 2026-06-06 accepts applications until 2026-06-06 23:59:59.999.
const deadlinePassed = (end_date) => {
  if (!end_date) return false;
  const deadline = new Date(end_date);
  deadline.setHours(23, 59, 59, 999);
  return new Date() > deadline;
};

// Fields the admin list/search tables actually render
const ADMIN_APP_PROJECTION = {
  application_ref_no: 1,
  registration_id: 1,
  advt_no: 1,
  status: 1,
  submitted_at: 1,
  createdAt: 1,
};

// Fields a candidate is allowed to see about their own application
const CANDIDATE_APP_PROJECTION =
  "application_ref_no registration_id advt_no status submitted_at exam_centre declaration_accepted experience_years createdAt";

// ── Candidate ─────────────────────────────────────────────────────────────────

export const submitApplication = async (req, res) => {
  try {
    const registration_id = req.user.registration_id;

    const validationError = validateSubmissionInput(req.body);
    if (validationError)
      return res
        .status(422)
        .json({ isOk: false, status: 422, message: validationError });

    const {
      exam_centre,
      declaration_accepted,
      experience_years,
      additional_fields,
    } = req.body;
    const advt_no = req.body.advt_no.trim();

    const advt = await Advertisement.findOne({ advt_no });
    if (!advt)
      return res
        .status(404)
        .json({ isOk: false, status: 404, message: "Advertisement not found" });
    if (advt.status !== "Published")
      return res.status(400).json({
        isOk: false,
        status: 400,
        message: "Advertisement is not open for applications",
      });
    if (deadlinePassed(advt.end_date))
      return res.status(400).json({
        isOk: false,
        status: 400,
        message: "Application deadline has passed",
      });

    // Idempotency: if an application already exists, return its reference
    // instead of failing — repeated submits never create duplicates.
    const existing = await Application.findOne({ registration_id, advt_no })
      .select(CANDIDATE_APP_PROJECTION)
      .lean();
    if (existing)
      return res.status(200).json({
        isOk: true,
        status: 200,
        message: "Already applied for this advertisement",
        data: {
          application_ref_no: existing.application_ref_no,
          advt_no: existing.advt_no,
          status: existing.status,
          submitted_at: existing.submitted_at,
        },
      });

    const app = new Application({
      registration_id,
      advt_no,
      exam_centre: sanitizeText(exam_centre),
      declaration_accepted,
      experience_years,
      additional_fields,
    });
    try {
      await app.save();
    } catch (err) {
      // Race-condition safety: two concurrent submits hit the unique
      // (registration_id, advt_no) index — return the winner's reference.
      if (err?.code === 11000) {
        const winner = await Application.findOne({ registration_id, advt_no })
          .select(CANDIDATE_APP_PROJECTION)
          .lean();
        if (winner)
          return res.status(200).json({
            isOk: true,
            status: 200,
            message: "Already applied for this advertisement",
            data: {
              application_ref_no: winner.application_ref_no,
              advt_no: winner.advt_no,
              status: winner.status,
              submitted_at: winner.submitted_at,
            },
          });
      }
      throw err;
    }

    // Fire-and-forget: application confirmation email
    Candidate.findOne({ registration_id })
      .select("email name")
      .lean()
      .then((cand) => {
        if (!cand?.email) return;
        sendTemplatedEmail("application_submitted", cand.email, {
          NAME: cand.name,
          APPLICATION_REF_NO: app.application_ref_no,
          ADVT_NO: app.advt_no,
          POST_TITLE: advt?.post_title?.en ?? "",
          PORTAL_URL: process.env.PORTAL_URL || "",
        }).catch((err) =>
          console.error("[EMAIL] application_submitted:", err.message),
        );
      })
      .catch(() => {});

    return res.status(201).json({
      isOk: true,
      status: 201,
      message: "Application submitted",
      data: {
        application_ref_no: app.application_ref_no,
        advt_no: app.advt_no,
        status: app.status,
        submitted_at: app.submitted_at,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

export const getMyApplication = async (req, res) => {
  try {
    const app = await Application.findOne({
      application_ref_no: req.params.ref,
    })
      .select(CANDIDATE_APP_PROJECTION)
      .lean();
    if (!app)
      return res
        .status(404)
        .json({ isOk: false, status: 404, message: "Application not found" });
    if (app.registration_id !== req.user.registration_id)
      return res
        .status(403)
        .json({ isOk: false, status: 403, message: "Access denied" });

    // Candidate + advertisement summaries so the printout shows full details
    const [candidate, advertisement] = await Promise.all([
      Candidate.findOne({ registration_id: app.registration_id })
        .select(
          "registration_id name father_husband_name dob gender category mobile email",
        )
        .lean(),
      Advertisement.findOne({ advt_no: app.advt_no })
        .select(
          "advt_no post_title class pay_scale application_fee end_date department",
        )
        .populate("department", "departmentName")
        .lean(),
    ]);

    return res.status(200).json({
      isOk: true,
      status: 200,
      data: { ...app, candidate, advertisement },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

export const editApplication = async (req, res) => {
  try {
    const app = await Application.findOne({
      application_ref_no: req.params.ref,
    });
    if (!app)
      return res
        .status(404)
        .json({ isOk: false, status: 404, message: "Application not found" });
    if (app.registration_id !== req.user.registration_id)
      return res
        .status(403)
        .json({ isOk: false, status: 403, message: "Access denied" });

    const advt = await Advertisement.findOne({ advt_no: app.advt_no });
    if (!advt || deadlinePassed(advt.end_date))
      return res.status(400).json({
        isOk: false,
        status: 400,
        message: "Edit deadline has passed",
      });

    EDITABLE_FIELDS.forEach((f) => {
      if (f in req.body && String(app[f]) !== String(req.body[f])) {
        app.edit_log.push({
          field: f,
          old_value: app[f],
          new_value: req.body[f],
          changed_at: new Date(),
        });
        app[f] = req.body[f];
      }
    });

    await app.save();
    return res.status(200).json({
      isOk: true,
      status: 200,
      message: "Application updated",
      data: app,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

export const getMyApplications = async (req, res) => {
  try {
    const list = await Application.find({
      registration_id: req.user.registration_id,
    })
      .select(CANDIDATE_APP_PROJECTION)
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

export const getApplicationPdf = async (req, res) => {
  try {
    const app = await Application.findOne({
      application_ref_no: req.params.ref,
    }).lean();
    if (!app)
      return res
        .status(404)
        .json({ isOk: false, status: 404, message: "Application not found" });
    if (app.registration_id !== req.user.registration_id)
      return res
        .status(403)
        .json({ isOk: false, status: 403, message: "Access denied" });

    const [candidate, advt] = await Promise.all([
      Candidate.findOne({ registration_id: app.registration_id })
        .select("-password -aadhaar_hash -login_attempts -lockout_until")
        .populate(
          "gender category marital_status ph_type qualification",
          "label code",
        )
        .lean(),
      Advertisement.findOne({ advt_no: app.advt_no })
        .populate("department", "name")
        .lean(),
    ]);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="application-${app.application_ref_no}.pdf"`,
    );

    await generateApplicationPdf(
      { application: app, candidate, advertisement: advt },
      res,
    );
  } catch (error) {
    if (!res.headersSent)
      return res
        .status(500)
        .json({ isOk: false, status: 500, message: error.message });
  }
};

// ── Admin ─────────────────────────────────────────────────────────────────────

export const listApplications = async (req, res) => {
  try {
    const {
      skip = 0,
      per_page = 20,
      status,
      advt_no,
      registration_id,
      sorton,
      sortdir,
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (advt_no) filter.advt_no = advt_no;
    if (registration_id) filter.registration_id = registration_id;

    const limit = Math.min(Number(per_page) || 20, 100);
    const [total, data] = await Promise.all([
      Application.countDocuments(filter),
      Application.find(filter)
        .select(ADMIN_APP_PROJECTION)
        .sort({ [sorton || "createdAt"]: sortdir === "asc" ? 1 : -1 })
        .skip(Number(skip))
        .limit(limit)
        .lean(),
    ]);

    return res.status(200).json({ isOk: true, status: 200, total, data });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

export const getApplicationForAdmin = async (req, res) => {
  try {
    const app = await Application.findOne({
      application_ref_no: req.params.ref,
    }).lean();
    if (!app)
      return res
        .status(404)
        .json({ isOk: false, status: 404, message: "Application not found" });

    const [candidate, advt] = await Promise.all([
      Candidate.findOne({ registration_id: app.registration_id })
        .select("-password -aadhaar_hash -login_attempts -lockout_until")
        .lean(),
      Advertisement.findOne({ advt_no: app.advt_no })
        .populate("department", "name")
        .lean(),
    ]);

    return res.status(200).json({
      isOk: true,
      status: 200,
      data: { application: app, candidate, advertisement: advt },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

export const exportApplications = async (req, res) => {
  try {
    const { status, advt_no, registration_id } = req.body || {};
    const filter = {};
    if (status) filter.status = status;
    if (advt_no) filter.advt_no = advt_no;
    if (registration_id) filter.registration_id = registration_id;

    const apps = await Application.find(filter).lean();
    return res
      .status(200)
      .json({ isOk: true, status: 200, count: apps.length, data: apps });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

// Legacy — kept for backward compat, routes below use ref-based endpoints
export const updateApplicationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const app = await Application.findById(req.params.id);
    if (!app)
      return res
        .status(404)
        .json({ isOk: false, status: 404, message: "Not found" });

    app.edit_log.push({
      field: "status",
      old_value: app.status,
      new_value: status,
      changed_at: new Date(),
    });
    app.status = status;
    await app.save();

    return res
      .status(200)
      .json({ isOk: true, status: 200, message: "Status updated", data: app });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

export const searchApplications = async (req, res) => {
  try {
    const {
      skip = 0,
      per_page = 10,
      match,
      status,
      advt_no,
      sorton,
      sortdir,
    } = req.body;
    const matchCond = {};
    if (status) matchCond.status = status;
    if (advt_no) matchCond.advt_no = advt_no;

    const pipeline = [];
    if (match) {
      pipeline.push({
        $match: {
          $or: [
            { registration_id: { $regex: match, $options: "i" } },
            { application_ref_no: { $regex: match, $options: "i" } },
          ],
        },
      });
    }
    pipeline.push({ $match: matchCond });
    pipeline.push({ $project: ADMIN_APP_PROJECTION });
    pipeline.push({
      $sort: { [sorton || "createdAt"]: sortdir === "asc" ? 1 : -1 },
    });
    pipeline.push({
      $facet: {
        stage1: [{ $group: { _id: null, count: { $sum: 1 } } }],
        stage2: [{ $skip: skip }, { $limit: per_page }],
      },
    });
    pipeline.push({
      $unwind: { path: "$stage1", preserveNullAndEmptyArrays: true },
    });
    pipeline.push({
      $project: { count: { $ifNull: ["$stage1.count", 0] }, data: "$stage2" },
    });

    const result = await Application.aggregate(pipeline);
    return res.status(200).json({ isOk: true, status: 200, data: result });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};
