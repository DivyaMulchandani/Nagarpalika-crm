import bcrypt from "bcrypt";
import crypto from "crypto";
import Candidate from "../../models/Candidate.js";
import { attachFileUrls, CANDIDATE_FILE_FIELDS } from "../../services/storage.service.js";

const hashAadhaar = (raw) =>
  crypto.createHash("sha256").update(raw.replace(/\s/g, "")).digest("hex");

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const INACTIVITY_MS = 30 * 60 * 1000;

// ── Registration (single-step, Phase 1 compatibility) ────────────────────────

export const registerCandidate = async (req, res) => {
  try {
    const { aadhaar, name, password, ...rest } = req.body;
    if (!aadhaar || !name || !password)
      return res.status(422).json({
        isOk: false,
        status: 422,
        message: "aadhaar, name, and password are required",
      });

    const aadhaar_hash = hashAadhaar(aadhaar);
    if (await Candidate.findOne({ aadhaar_hash }))
      return res.status(409).json({
        isOk: false,
        status: 409,
        message: "Aadhaar already registered",
      });

    const hashed = await bcrypt.hash(password, 12);
    const candidate = new Candidate({
      aadhaar_hash,
      name,
      password: hashed,
      ...rest,
    });
    await candidate.save();

    const { password: _pw, aadhaar_hash: _ah, ...safe } = candidate.toObject();
    return res
      .status(201)
      .json({ isOk: true, status: 201, message: "Registered", data: safe });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

// ── Auth ─────────────────────────────────────────────────────────────────────

export const loginCandidate = async (req, res) => {
  try {
    const { registration_id, password } = req.body;
    if (!registration_id || !password)
      return res.status(422).json({
        isOk: false,
        status: 422,
        message: "registration_id and password are required",
      });

    const candidate = await Candidate.findOne({ registration_id });
    if (!candidate)
      return res
        .status(401)
        .json({ isOk: false, status: 401, message: "Invalid credentials" });

    // Lockout check
    if (candidate.lockout_until && new Date() < candidate.lockout_until) {
      const remaining = Math.ceil(
        (candidate.lockout_until - Date.now()) / 60000,
      );
      return res.status(403).json({
        isOk: false,
        status: 403,
        message: `Account locked. Try again in ${remaining} minute(s).`,
      });
    }

    const match = await bcrypt.compare(password, candidate.password);
    if (!match) {
      candidate.login_attempts = (candidate.login_attempts || 0) + 1;
      if (candidate.login_attempts >= MAX_LOGIN_ATTEMPTS) {
        candidate.lockout_until = new Date(
          Date.now() + LOCKOUT_MINUTES * 60 * 1000,
        );
        candidate.login_attempts = 0;
      }
      await candidate.save();
      return res
        .status(401)
        .json({ isOk: false, status: 401, message: "Invalid credentials" });
    }

    // Reset failed attempts on success
    if (candidate.login_attempts > 0 || candidate.lockout_until) {
      candidate.login_attempts = 0;
      candidate.lockout_until = undefined;
      await candidate.save();
    }

    // Session fixation prevention
    await new Promise((resolve, reject) =>
      req.session.regenerate((err) => (err ? reject(err) : resolve())),
    );

    req.session.user = {
      id: candidate._id.toString(),
      role: "CANDIDATE",
      registration_id: candidate.registration_id,
      name: candidate.name,
      loginAt: Date.now(),
    };

    // Absolute 30-minute session from login — fixed expiry
    req.session.cookie.maxAge = INACTIVITY_MS;

    return res.status(200).json({
      isOk: true,
      status: 200,
      message: "Login successful",
      data: {
        registration_id: candidate.registration_id,
        name: candidate.name,
        otr_status: candidate.otr_status,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

export const logoutCandidate = async (req, res) => {
  try {
    await new Promise((resolve, reject) =>
      req.session.destroy((err) => (err ? reject(err) : resolve())),
    );
    res.clearCookie("sessionId");
    return res
      .status(200)
      .json({ isOk: true, status: 200, message: "Logged out" });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

export const resetCandidatePassword = async (req, res) => {
  try {
    const { registration_id, otp_token, new_password } = req.body;
    if (!registration_id || !otp_token || !new_password)
      return res.status(422).json({
        isOk: false,
        status: 422,
        message: "registration_id, otp_token, and new_password required",
      });

    if (new_password.length < 8)
      return res.status(422).json({
        isOk: false,
        status: 422,
        message: "Password must be at least 8 characters",
      });

    // otp_token is a one-time token set in session by verifyCandidateOtp
    if (!req.session.otpVerified || req.session.otpVerified !== registration_id)
      return res.status(401).json({
        isOk: false,
        status: 401,
        message: "OTP verification required first",
      });

    const candidate = await Candidate.findOne({ registration_id });
    if (!candidate)
      return res
        .status(404)
        .json({ isOk: false, status: 404, message: "Candidate not found" });

    candidate.password = await bcrypt.hash(new_password, 12);
    candidate.login_attempts = 0;
    candidate.lockout_until = undefined;
    await candidate.save();

    delete req.session.otpVerified;

    return res
      .status(200)
      .json({ isOk: true, status: 200, message: "Password reset successful" });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

// ── Profile ───────────────────────────────────────────────────────────────────

export const getMyProfile = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.user.id).select(
      "-password -aadhaar_hash -login_attempts -lockout_until",
    );
    if (!candidate)
      return res
        .status(404)
        .json({ isOk: false, status: 404, message: "Not found" });
    // Absolute session expiry (login time + 30 min) — the frontend timer
    // seeds its countdown from this, so refreshes/activity never reset it.
    const loginAt = req.session?.user?.loginAt;
    const data = await attachFileUrls(candidate, CANDIDATE_FILE_FIELDS);
    return res.status(200).json({
      isOk: true,
      status: 200,
      data,
      session_expires_at: loginAt
        ? new Date(loginAt + INACTIVITY_MS).toISOString()
        : null,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

// PATCH — edit window enforced, locked fields rejected
export const editCandidate = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.user.id);
    if (!candidate)
      return res
        .status(404)
        .json({ isOk: false, status: 404, message: "Not found" });

    if (
      candidate.edit_window_expires_at &&
      new Date() > candidate.edit_window_expires_at
    )
      return res.status(400).json({
        isOk: false,
        status: 400,
        message: "Edit window has closed",
        expired_at: candidate.edit_window_expires_at,
      });

    const LOCKED = [
      "aadhaar_hash",
      "dob",
      "name",
      "registration_id",
      "password",
      "login_attempts",
      "lockout_until",
    ];
    const attempted_locked = LOCKED.filter((f) => f in req.body);
    if (attempted_locked.length)
      return res.status(422).json({
        isOk: false,
        status: 422,
        message: `Cannot edit locked fields: ${attempted_locked.join(", ")}`,
      });

    const EDITABLE = [
      "address_current",
      "address_permanent",
      "mobile",
      "email",
      "photo_path",
      "signature_path",
      "languages",
      "alternate_mobile",
      "mother_tongue",
    ];
    EDITABLE.forEach((f) => {
      if (f in req.body) candidate[f] = req.body[f];
    });

    await candidate.save();
    const {
      password: _pw,
      aadhaar_hash: _ah,
      login_attempts: _la,
      lockout_until: _lu,
      ...safe
    } = candidate.toObject();
    return res.status(200).json({
      isOk: true,
      status: 200,
      message: "Profile updated",
      data: safe,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

// Legacy PUT — kept for Phase 1 compatibility
export const updateMyProfile = editCandidate;

// ── Find ──────────────────────────────────────────────────────────────────────

export const findCandidate = async (req, res) => {
  // Identical timing + response shape whether found or not (enumeration prevention)
  const DELAY_MS = 300;
  const start = Date.now();

  const respond = (found) => {
    const elapsed = Date.now() - start;
    const wait = Math.max(0, DELAY_MS - elapsed);
    setTimeout(() => {
      // Never return Registration ID in response body — delivered via SMS + email
      res.status(200).json({
        isOk: true,
        status: 200,
        message: found
          ? "Registration ID has been sent to your registered mobile and email."
          : "Registration ID has been sent to your registered mobile and email.",
      });
    }, wait);
  };

  try {
    const { aadhaar, mobile, dob } = req.body;
    if ((!aadhaar && !mobile) || !dob)
      return res.status(422).json({
        isOk: false,
        status: 422,
        message: "Provide (aadhaar or mobile) and dob",
      });

    let candidate = null;
    if (aadhaar) {
      const aadhaar_hash = hashAadhaar(aadhaar);
      candidate = await Candidate.findOne({
        aadhaar_hash,
        dob: new Date(dob),
      }).select("registration_id mobile email");
    } else {
      candidate = await Candidate.findOne({
        mobile,
        dob: new Date(dob),
      }).select("registration_id mobile email");
    }

    if (candidate) {
      // TODO Phase 8: deliver registration_id via SMS + email
      console.log(
        `[FIND] Registration ID ${candidate.registration_id} — delivery pending SMS/email integration`,
      );
    }

    respond(!!candidate);
  } catch {
    respond(false);
  }
};

// ── Admin ─────────────────────────────────────────────────────────────────────

export const getCandidateById = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id).select(
      "-password -aadhaar_hash -login_attempts -lockout_until",
    );
    if (!candidate)
      return res
        .status(404)
        .json({ isOk: false, status: 404, message: "Not found" });
    const data = await attachFileUrls(candidate, CANDIDATE_FILE_FIELDS);
    return res.status(200).json({ isOk: true, status: 200, data });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

export const searchCandidates = async (req, res) => {
  try {
    const {
      skip = 0,
      per_page = 10,
      match,
      otr_status,
      sorton,
      sortdir,
    } = req.body;
    const matchCond = {};
    if (otr_status) matchCond.otr_status = otr_status;

    const pipeline = [];
    if (match) {
      pipeline.push({
        $match: {
          $or: [
            { name: { $regex: match, $options: "i" } },
            { registration_id: { $regex: match, $options: "i" } },
            { email: { $regex: match, $options: "i" } },
          ],
        },
      });
    }
    pipeline.push({ $match: matchCond });
    // Project only what the admin candidate list renders
    pipeline.push({
      $project: {
        registration_id: 1,
        name: 1,
        mobile: 1,
        email: 1,
        category: 1,
        otr_status: 1,
        createdAt: 1,
      },
    });
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

    const result = await Candidate.aggregate(pipeline);
    return res.status(200).json({ isOk: true, status: 200, data: result });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

export const exportCandidates = async (req, res) => {
  try {
    const { otr_status, category } = req.body || {};
    const filter = {};
    if (otr_status) filter.otr_status = otr_status;
    if (category) filter.category = category;

    const candidates = await Candidate.find(filter)
      .select("-password -aadhaar_hash -login_attempts -lockout_until")
      .lean();

    // Return JSON — CSV conversion deferred to Phase 7 admin panel
    return res.status(200).json({
      isOk: true,
      status: 200,
      count: candidates.length,
      data: candidates,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};
