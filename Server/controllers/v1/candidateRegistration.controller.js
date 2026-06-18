import crypto from "crypto";
import path from "path";
import Candidate from "../../models/Candidate.js";
import Qualification from "../../models/Qualification.js";
import { sendTemplatedEmail } from "../../services/email.service.js";

const EDIT_WINDOW_HOURS = 72;

const hashAadhaar = (raw) =>
  crypto.createHash("sha256").update(raw.replace(/\s/g, "")).digest("hex");

const VERIFY_TTL_MS = 15 * 60 * 1000;
const MOBILE_RE = /^[6-9]\d{9}$/;
const PASSWORD_RE = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\|;'`~]).{8,}$/;

const isVerifyFresh = (at) => at && Date.now() - at < VERIFY_TTL_MS;


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
    return res.status(500).json({ isOk: false, status: 500, message: error.message });
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
    return res.status(500).json({ isOk: false, status: 500, message: error.message });
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

    const stepNum = Number(step);
    if (!Number.isInteger(stepNum) || stepNum < 1 || stepNum > 10)
      return res.status(422).json({
        isOk: false,
        status: 422,
        message: "step must be an integer between 1 and 10",
      });

    if (typeof data !== "object" || Array.isArray(data))
      return res
        .status(422)
        .json({ isOk: false, status: 422, message: "data must be an object" });

    if (JSON.stringify(data).length > 20000)
      return res
        .status(422)
        .json({ isOk: false, status: 422, message: "data payload too large" });

    // Mass-assignment protection: session data is later spread into the
    // Candidate document, so privileged/identity fields must never be
    // settable through this endpoint.
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
      step: stepNum,
      data: { ...req.session.candidateStep.data, ...sanitized },
    };

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

    if (!PASSWORD_RE.test(password))
      return res.status(422).json({
        isOk: false,
        status: 422,
        message: "Password must be at least 8 characters with 1 uppercase, 1 digit, and 1 special character",
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

    return res.status(201).json({
      isOk: true,
      status: 201,
      message: "Registration complete",
      data: { registration_id: candidate.registration_id },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
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

    req.session.candidateStep.data.caste_cert_path = req.file.path;
    return res
      .status(200)
      .json({ isOk: true, status: 200, message: "Caste certificate uploaded" });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
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

    req.session.candidateStep.data.udid_cert_path = req.file.path;
    return res
      .status(200)
      .json({ isOk: true, status: 200, message: "UDID certificate uploaded" });
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
