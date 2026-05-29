import crypto from "crypto";
import path from "path";
import Candidate from "../../models/Candidate.js";
import { sendTemplatedEmail } from "../../services/email.service.js";

const EDIT_WINDOW_HOURS = 72;

const hashAadhaar = (raw) =>
  crypto.createHash("sha256").update(raw.replace(/\s/g, "")).digest("hex");

// Step 1 — initiate; mobile OTP must be verified first
export const initRegistration = async (req, res) => {
  try {
    const { aadhaar, mobile } = req.body;
    if (!aadhaar || !mobile)
      return res.status(422).json({
        isOk: false,
        status: 422,
        message: "aadhaar and mobile are required",
      });

    if (req.session.mobileOtpVerified !== mobile)
      return res.status(401).json({
        isOk: false,
        status: 401,
        message: "Mobile OTP verification required first",
      });

    const aadhaar_hash = hashAadhaar(aadhaar);
    if (await Candidate.findOne({ aadhaar_hash }))
      return res.status(409).json({
        isOk: false,
        status: 409,
        message: "Aadhaar already registered",
      });

    req.session.candidateStep = { step: 1, aadhaar_hash, mobile, data: {} };

    return res.status(200).json({
      isOk: true,
      status: 200,
      message: "Registration initiated",
      data: { step: 1 },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

// Merge arbitrary step data into the session
export const saveStep = async (req, res) => {
  try {
    if (!req.session.candidateStep)
      return res.status(400).json({
        isOk: false,
        status: 400,
        message: "No registration in progress",
      });

    const { step, data } = req.body;
    if (!step || !data)
      return res.status(422).json({
        isOk: false,
        status: 422,
        message: "step and data are required",
      });

    req.session.candidateStep.step = step;
    Object.assign(req.session.candidateStep.data, data);

    return res
      .status(200)
      .json({ isOk: true, status: 200, message: "Step saved", data: { step } });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

export const uploadPhoto = async (req, res) => {
  try {
    if (!req.session.candidateStep)
      return res.status(400).json({
        isOk: false,
        status: 400,
        message: "No registration in progress",
      });
    if (!req.file)
      return res
        .status(422)
        .json({ isOk: false, status: 422, message: "Photo file required" });

    req.session.candidateStep.data.photo_path = req.file.path;
    return res
      .status(200)
      .json({ isOk: true, status: 200, message: "Photo uploaded" });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

export const uploadSignature = async (req, res) => {
  try {
    if (!req.session.candidateStep)
      return res.status(400).json({
        isOk: false,
        status: 400,
        message: "No registration in progress",
      });
    if (!req.file)
      return res
        .status(422)
        .json({ isOk: false, status: 422, message: "Signature file required" });

    req.session.candidateStep.data.signature_path = req.file.path;
    return res
      .status(200)
      .json({ isOk: true, status: 200, message: "Signature uploaded" });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

// Final submit — creates Candidate record, clears step session
export const submitRegistration = async (req, res) => {
  try {
    const stepSession = req.session.candidateStep;
    if (!stepSession)
      return res.status(400).json({
        isOk: false,
        status: 400,
        message: "No registration in progress",
      });

    const { name, password } = req.body;
    if (!name || !password)
      return res.status(422).json({
        isOk: false,
        status: 422,
        message: "name and password are required",
      });

    if (password.length < 8)
      return res.status(422).json({
        isOk: false,
        status: 422,
        message: "Password must be at least 8 characters",
      });

    const { aadhaar_hash, mobile, data } = stepSession;

    // Re-check duplicate in case another request registered the same Aadhaar during this session
    if (await Candidate.findOne({ aadhaar_hash }))
      return res.status(409).json({
        isOk: false,
        status: 409,
        message: "Aadhaar already registered",
      });

    const bcrypt = await import("bcrypt");
    const hashed = await bcrypt.default.hash(password, 12);

    const edit_window_expires_at = new Date(
      Date.now() + EDIT_WINDOW_HOURS * 60 * 60 * 1000,
    );

    const candidate = new Candidate({
      aadhaar_hash,
      name,
      password: hashed,
      mobile,
      otr_status: "complete",
      edit_window_expires_at,
      ...data,
    });
    await candidate.save();

    // Fire-and-forget: deliver registration ID to candidate email
    if (candidate.email) {
      sendTemplatedEmail("registration_id_issued", candidate.email, {
        NAME: candidate.name,
        REGISTRATION_ID: candidate.registration_id,
        PORTAL_URL: process.env.PORTAL_URL || "",
      }).catch((err) =>
        console.error("[EMAIL] registration_id_issued:", err.message),
      );
    }

    delete req.session.candidateStep;
    delete req.session.mobileOtpVerified;

    // registration_id delivered via SMS/email in Phase 8 — not returned here
    return res.status(201).json({
      isOk: true,
      status: 201,
      message:
        "Registration complete. Your Registration ID will be sent to your registered mobile and email.",
    });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

// Resume — returns session data without exposing aadhaar_hash
export const resumeRegistration = async (req, res) => {
  try {
    if (!req.session.candidateStep)
      return res.status(404).json({
        isOk: false,
        status: 404,
        message: "No registration in progress",
      });

    const { step, data } = req.session.candidateStep;
    return res
      .status(200)
      .json({ isOk: true, status: 200, data: { step, data } });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};
