import crypto from "crypto";
import path from "path";
import Candidate from "../../models/Candidate.js";
import Qualification from "../../models/Qualification.js";
import { sendEmail, sendTemplatedEmail } from "../../services/email.service.js";
import { resolveFileUrl, deleteFile } from "../../services/storage.service.js";

const EDIT_WINDOW_HOURS = 72;

const hashAadhaar = (raw) =>
  crypto.createHash("sha256").update(raw.replace(/\s/g, "")).digest("hex");

const VERIFY_TTL_MS = 15 * 60 * 1000;
const CANDIDATE_SESSION_MS = 30 * 60 * 1000; // keep in sync with authMiddleware
const MOBILE_RE = /^[6-9]\d{9}$/;
const PASSWORD_RE = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\|;'`~]).{8,}$/;

const isVerifyFresh = (at) => at && Date.now() - at < VERIFY_TTL_MS;

// Best-effort cleanup of a replaced upload; a missing/already-deleted key is not an error.
const deletePreviousFile = (filePath) => {
  if (!filePath) return;
  deleteFile(filePath).catch((err) =>
    console.error("[Upload] failed to delete replaced file:", filePath, err.message),
  );
};


// Pre-OTP: validate Aadhaar format + checksum + uniqueness
export const verifyAadhaar = async (req, res) => {
  try {
    const { aadhaar } = req.body;
    if (!aadhaar || !/^\d{12}$/.test(String(aadhaar).replace(/\s/g, "")))
      return res.status(422).json({ isOk: false, status: 422, message: "A valid 12-digit Aadhaar number is required" });

    const { isValidVerhoeff } = await import("../../utils/verhoeff.js");
    const clean = String(aadhaar).replace(/\s/g, "");
    if (!isValidVerhoeff(clean))
      return res.status(422).json({ isOk: false, status: 422, message: "Invalid Aadhaar number" });

    const aadhaar_hash = hashAadhaar(clean);
    if (await Candidate.findOne({ aadhaar_hash }))
      return res.status(409).json({ isOk: false, status: 409, message: "Aadhaar already registered" });

    req.session.aadhaarVerified = { hash: aadhaar_hash, at: Date.now() };
    return res.status(200).json({ isOk: true, status: 200, message: "Aadhaar verified" });
  } catch (error) {
    console.error("[candidateReg] verifyAadhaar error:", error.message);
    return res.status(500).json({ isOk: false, status: 500, message: "An unexpected error occurred" });
  }
};

// Pre-OTP: validate mobile format + uniqueness
export const verifyMobile = async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile || !MOBILE_RE.test(mobile))
      return res.status(422).json({ isOk: false, status: 422, message: "A valid 10-digit mobile number is required" });

    if (await Candidate.findOne({ mobile }))
      return res.status(409).json({ isOk: false, status: 409, message: "Mobile number already registered" });

    req.session.mobileFormatVerified = { mobile, at: Date.now() };
    return res.status(200).json({ isOk: true, status: 200, message: "Mobile number verified" });
  } catch (error) {
    console.error("[candidateReg] verifyMobile error:", error.message);
    return res.status(500).json({ isOk: false, status: 500, message: "An unexpected error occurred" });
  }
};

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
      .json({ isOk: false, status: 500, message: "An unexpected error occurred" });
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

    const stepNum = Number(step);
    if (!Number.isInteger(stepNum) || stepNum < 1 || stepNum > 10)
      return res.status(422).json({
        isOk: false,
        status: 422,
        message: "step must be an integer between 1 and 10",
      });

    const currentStep = req.session.candidateStep.step || 1;
    if (stepNum > currentStep + 1) {
      return res.status(403).json({
        isOk: false,
        status: 403,
        message: `Please complete Step ${currentStep} first before proceeding to Step ${stepNum}.`,
      });
    }

    if (typeof data !== "object" || Array.isArray(data))
      return res
        .status(422)
        .json({ isOk: false, status: 422, message: "data must be an object" });

    if (JSON.stringify(data).length > 20000)
      return res
        .status(422)
        .json({ isOk: false, status: 422, message: "data payload too large" });

    // 1. Mass-assignment protection: explicitly forbidden system & identity keys
    const FORBIDDEN_KEYS = new Set([
      "_id",
      "registration_id",
      "aadhaar_hash",
      "password",
      "otr_status",
      "edit_window_expires_at",
      "login_attempts",
      "lockout_until",
      "mobile",
      "mobile_verified",
      "email_verified",
      "createdAt",
      "updatedAt",
      "__v",
    ]);
    const forbidden = Object.keys(data).filter(
      (k) => FORBIDDEN_KEYS.has(k) || k.startsWith("$") || k.includes("."),
    );
    if (forbidden.length)
      return res.status(422).json({
        isOk: false,
        status: 422,
        message: `Fields not allowed: ${forbidden.join(", ")}`,
      });

    // 2. Strict Whitelist of valid Candidate profile fields for extra-field protection
    const ALLOWED_PROFILE_KEYS = new Set([
      "name",
      "father_husband_name",
      "dob",
      "gender",
      "category",
      "nationality",
      "religion",
      "marital_status",
      "address_permanent",
      "address_current",
      "alternate_mobile",
      "email",
      "ph_status",
      "ph_type",
      "ph_percentage",
      "ex_serviceman",
      "qualification",
      "languages",
      "mother_tongue",
      "photo_path",
      "signature_path",
      "caste_cert_no",
      "caste_cert_path",
      "udid_cert_path",
    ]);

    const unknownKeys = Object.keys(data).filter((k) => !ALLOWED_PROFILE_KEYS.has(k));
    if (unknownKeys.length)
      return res.status(422).json({
        isOk: false,
        status: 422,
        message: `Unknown or unauthorized profile fields: ${unknownKeys.join(", ")}`,
      });

    // Sanitize string values (strip HTML angle brackets, cap length)
    const sanitized = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [
        k,
        typeof v === "string" ? v.replace(/[<>]/g, "").slice(0, 2000) : v,
      ]),
    );


    if (sanitized.qualification) {
      const qualName = String(sanitized.qualification).trim();
      const exact = await Qualification.findOne({ name: qualName, isActive: true });
      if (!exact) {
        const othersEntry = await Qualification.findOne({
          name: { $regex: /^others$/i },
          isActive: true,
        });
        if (!othersEntry || !qualName) {
          return res.status(422).json({
            isOk: false,
            status: 422,
            message: "Invalid qualification selected",
          });
        }
      }
    }

    req.session.candidateStep = {
      ...req.session.candidateStep,
      step: Math.max(currentStep, stepNum),
      data: { ...req.session.candidateStep.data, ...sanitized },
    };

    return res
      .status(200)
      .json({ isOk: true, status: 200, message: "Step saved", data: { step } });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: "An unexpected error occurred" });
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

    deletePreviousFile(req.session.candidateStep.data.photo_path);
    req.session.candidateStep.data.photo_path = req.file.path;
    const url = await resolveFileUrl(req.file.path);
    return res
      .status(200)
      .json({ isOk: true, status: 200, message: "Photo uploaded", data: { url } });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: "An unexpected error occurred" });
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

    deletePreviousFile(req.session.candidateStep.data.signature_path);
    req.session.candidateStep.data.signature_path = req.file.path;
    const url = await resolveFileUrl(req.file.path);
    return res
      .status(200)
      .json({ isOk: true, status: 200, message: "Signature uploaded", data: { url } });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: "An unexpected error occurred" });
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

    if (!PASSWORD_RE.test(password))
      return res.status(422).json({
        isOk: false,
        status: 422,
        message: "Password must be at least 8 characters with 1 uppercase, 1 digit, and 1 special character",
      });

    const { aadhaar_hash, mobile, data } = stepSession;

    // Server-side required profile fields validation
    const candidateName = (name || data.name || "").trim();
    const candidateDob = req.body.dob || data.dob;
    const candidateGender = req.body.gender || data.gender;
    const candidateCategory = req.body.category || data.category;

    const candidateMotherTongue = req.body.mother_tongue || data.mother_tongue;
    const candidatePhoto = data.photo_path;
    const candidateSig = data.signature_path;

    if (!candidateName)
      return res.status(422).json({
        isOk: false,
        status: 422,
        message: "Candidate name is required",
      });

    if (!candidateDob)
      return res.status(422).json({
        isOk: false,
        status: 422,
        message: "Date of Birth (dob) is required",
      });

    if (!candidateGender)
      return res.status(422).json({
        isOk: false,
        status: 422,
        message: "Gender is required",
      });

    if (!candidateCategory)
      return res.status(422).json({
        isOk: false,
        status: 422,
        message: "Category is required",
      });

    if (!candidatePhoto)
      return res.status(422).json({
        isOk: false,
        status: 422,
        message: "Candidate photo upload is required",
      });

    if (!candidateSig)
      return res.status(422).json({
        isOk: false,
        status: 422,
        message: "Candidate signature upload is required",
      });

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
      }).catch(async (err) => {
        console.warn("[EMAIL] Templated email failed, falling back to direct sendEmail:", err.message);
        await sendEmail({
          to: candidate.email,
          subject: "Your Nagarpalika OTR Registration ID Issued",
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
              <h2 style="color: #1e3a8a;">Nagarpalika Recruitment Portal</h2>
              <p>Dear <strong>${candidate.name || "Candidate"}</strong>,</p>
              <p>Your One-Time Registration (OTR) has been successfully submitted.</p>
              <p>Your Registration ID is:</p>
              <div style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #2563eb; margin: 15px 0;">${candidate.registration_id}</div>
              <p>Please keep this Registration ID safe for future logins and job applications.</p>
            </div>
          `,
          text: `Dear ${candidate.name || "Candidate"}, your Nagarpalika OTR Registration ID is ${candidate.registration_id}. Keep it safe.`,
        }).catch((e) => console.error("[EMAIL] Fallback sendEmail failed:", e.message));
      });
    }

    // Auto-login: regenerate session (fixation prevention) and create a
    // candidate session, same as verifyLoginOtp. Regeneration also discards
    // the registration-step and OTP-verified state.
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

    // Absolute 30-minute session, fixed expiry — matches OTP login
    req.session.cookie.maxAge = CANDIDATE_SESSION_MS;

    return res.status(201).json({
      isOk: true,
      status: 201,
      message: "Registration complete",
      data: {
        registration_id: candidate.registration_id,
        name: candidate.name,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: "An unexpected error occurred" });
  }
};

export const uploadCasteCert = async (req, res) => {
  try {
    if (!req.session.candidateStep)
      return res.status(400).json({
        isOk: false,
        status: 400,
        message: "No registration in progress",
      });
    if (!req.file)
      return res.status(422).json({
        isOk: false,
        status: 422,
        message: "Caste certificate file required",
      });

    deletePreviousFile(req.session.candidateStep.data.caste_cert_path);
    req.session.candidateStep.data.caste_cert_path = req.file.path;
    const url = await resolveFileUrl(req.file.path);
    return res
      .status(200)
      .json({ isOk: true, status: 200, message: "Caste certificate uploaded", data: { url } });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: "An unexpected error occurred" });
  }
};

export const uploadUdidCert = async (req, res) => {
  try {
    if (!req.session.candidateStep)
      return res.status(400).json({
        isOk: false,
        status: 400,
        message: "No registration in progress",
      });
    if (!req.file)
      return res.status(422).json({
        isOk: false,
        status: 422,
        message: "UDID certificate file required",
      });

    deletePreviousFile(req.session.candidateStep.data.udid_cert_path);
    req.session.candidateStep.data.udid_cert_path = req.file.path;
    const url = await resolveFileUrl(req.file.path);
    return res
      .status(200)
      .json({ isOk: true, status: 200, message: "UDID certificate uploaded", data: { url } });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: "An unexpected error occurred" });
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
      .json({ isOk: false, status: 500, message: "An unexpected error occurred" });
  }
};
