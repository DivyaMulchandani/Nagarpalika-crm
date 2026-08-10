import crypto from "crypto";
import Candidate from "../../models/Candidate.js";
import { deliverOtp } from "../../services/notification.service.js";
import { otpSettings } from "../../config/portal.config.js";

// In-memory rate limiter: target → { count, windowStart }
const otpRateMap = new Map();
const OTP_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const OTP_PER_WINDOW = otpSettings.perHourLimit;
const OTP_EXPIRE_MS = otpSettings.expireMinutes * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = otpSettings.maxVerifyAttempts;

const checkOtpRate = (target) => {
  const now = Date.now();
  const entry = otpRateMap.get(target);
  if (!entry || now - entry.windowStart > OTP_WINDOW_MS) {
    otpRateMap.set(target, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= OTP_PER_WINDOW) return false;
  entry.count += 1;
  return true;
};

const generateOtp = () => crypto.randomInt(100000, 999999).toString();

const CANDIDATE_SESSION_MS = 30 * 60 * 1000; // keep in sync with authMiddleware
const MOBILE_RE = /^[6-9]\d{9}$/;
const OTP_RE = /^\d{6}$/;
// Opt-in flag; works regardless of NODE_ENV so it can be toggled on a
// production-hosted server for testing. Defaults off — keep it off in real prod.
const isDevOtpEnabled = () => process.env.ENABLE_DEV_OTP === "true";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isValidMobile = (m) => typeof m === "string" && MOBILE_RE.test(m);
const isValidOtp = (o) => typeof o === "string" && OTP_RE.test(o);
const isValidEmail = (e) => typeof e === "string" && e.length <= 254 && EMAIL_RE.test(e.trim());

// Send OTP to candidate mobile (pre-registration — verified by phone number)
export const sendCandidateOtp = async (req, res) => {
  try {
    const { mobile, aadhaar, email, preferredChannel } = req.body;
    if (!isValidMobile(mobile))
      return res.status(422).json({
        isOk: false,
        status: 422,
        message: "A valid 10-digit mobile number is required",
      });

    if (email && !isValidEmail(email))
      return res.status(422).json({
        isOk: false,
        status: 422,
        message: "Please provide a valid email address",
      });

    const VERIFY_TTL_MS = 15 * 60 * 1000;
    const isFresh = (at) => at && Date.now() - at < VERIFY_TTL_MS;
    const aadhaarOk = req.session.aadhaarVerified;
    const mobileOk = req.session.mobileFormatVerified;

    if (!aadhaarOk || !isFresh(aadhaarOk.at))
      return res
        .status(403)
        .json({
          isOk: false,
          status: 403,
          message: "Aadhaar verification required before OTP",
        });
    if (!mobileOk || !isFresh(mobileOk.at) || mobileOk.mobile !== mobile)
      return res
        .status(403)
        .json({
          isOk: false,
          status: 403,
          message: "Mobile verification required before OTP",
        });
    if (aadhaar && aadhaarOk.hash) {
      const hash = crypto
        .createHash("sha256")
        .update(String(aadhaar).replace(/\s/g, ""))
        .digest("hex");
      if (hash !== aadhaarOk.hash)
        return res
          .status(403)
          .json({
            isOk: false,
            status: 403,
            message: "Aadhaar does not match verified number",
          });
    }

    if (await Candidate.findOne({ mobile }))
      return res.status(409).json({
        isOk: false,
        status: 409,
        message: "Mobile number already registered",
      });

    if (!checkOtpRate(mobile))
      return res.status(429).json({
        isOk: false,
        status: 429,
        message: "Too many OTP requests. Try again in 1 hour.",
      });

    const otp = generateOtp();
    const expires_at = Date.now() + OTP_EXPIRE_MS;

    req.session.candidateOtp = {
      target: mobile,
      type: "mobile",
      hash: crypto.createHash("sha256").update(otp).digest("hex"),
      expires_at,
      attempts: 0,
    };

    const deliveryResult = await deliverOtp({
      mobile,
      email,
      otp,
      trigger: "otp_registration",
      preferredChannel,
    }).catch((err) => {
      console.error("[OTP] delivery error:", err.message);
      return { channel: "none", error: err.message };
    });

    if (isDevOtpEnabled() && process.env.NODE_ENV !== "production") {
      console.log(`[DEV OTP LOG] Generated OTP: ${otp}`);
    }

    const extra = {};
    if (deliveryResult?.channel) extra.channel = deliveryResult.channel;

    return res.status(200).json({
      isOk: true,
      status: 200,
      message: deliveryResult?.channel && deliveryResult.channel !== "none"
        ? `OTP sent successfully via ${deliveryResult.channel.toUpperCase()}`
        : "OTP sent to your mobile number",
      ...(Object.keys(extra).length ? { data: extra } : {}),
    });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

// Verify OTP for mobile — sets req.session.mobileOtpVerified on success
export const verifyCandidateOtp = async (req, res) => {
  try {
    const { mobile, otp } = req.body;
    if (!isValidMobile(mobile) || !isValidOtp(otp))
      return res.status(422).json({
        isOk: false,
        status: 422,
        message: "A valid mobile number and 6-digit OTP are required",
      });

    const stored = req.session.candidateOtp;
    if (!stored || stored.target !== mobile || stored.type !== "mobile")
      return res.status(400).json({
        isOk: false,
        status: 400,
        message: "No pending OTP for this mobile",
      });

    if (Date.now() > stored.expires_at) {
      delete req.session.candidateOtp;
      return res
        .status(400)
        .json({ isOk: false, status: 400, message: "OTP has expired" });
    }

    if (stored.attempts >= MAX_VERIFY_ATTEMPTS) {
      delete req.session.candidateOtp;
      return res.status(429).json({
        isOk: false,
        status: 429,
        message: "Too many incorrect attempts. Request a new OTP.",
      });
    }

    stored.attempts += 1;

    const inputHash = crypto.createHash("sha256").update(otp).digest("hex");
    const storedHashBuf = Buffer.from(stored.hash, "hex");
    const inputHashBuf = Buffer.from(inputHash, "hex");

    const match =
      storedHashBuf.length === inputHashBuf.length &&
      crypto.timingSafeEqual(storedHashBuf, inputHashBuf);

    if (!match)
      return res
        .status(401)
        .json({ isOk: false, status: 401, message: "Invalid OTP" });

    delete req.session.candidateOtp;
    req.session.mobileOtpVerified = mobile;

    return res
      .status(200)
      .json({ isOk: true, status: 200, message: "OTP verified" });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

// Send OTP for password reset — candidate must exist
export const sendPasswordResetOtp = async (req, res) => {
  try {
    const { registration_id, preferredChannel } = req.body;
    if (!registration_id)
      return res.status(422).json({
        isOk: false,
        status: 422,
        message: "registration_id is required",
      });

    // Enumeration-safe: identical response regardless of whether candidate exists
    const candidate = await Candidate.findOne({ registration_id }).select(
      "mobile email",
    );

    if (candidate && !checkOtpRate(registration_id))
      return res.status(429).json({
        isOk: false,
        status: 429,
        message: "Too many OTP requests. Try again in 1 hour.",
      });

    if (candidate) {
      const otp = generateOtp();
      const expires_at = Date.now() + OTP_EXPIRE_MS;

      req.session.candidateOtp = {
        target: registration_id,
        type: "password_reset",
        hash: crypto.createHash("sha256").update(otp).digest("hex"),
        expires_at,
        attempts: 0,
      };

      deliverOtp({
        mobile: candidate.mobile,
        otp,
        trigger: "otp_password_reset",
        email: candidate.email,
        preferredChannel,
      }).catch((err) =>
        console.error("[OTP] reset delivery error:", err.message),
      );
    }

    return res.status(200).json({
      isOk: true,
      status: 200,
      message: "If this Registration ID exists, an OTP has been sent.",
    });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

// ── Login via mobile / email / registration_id OTP ─────────────────────────────

// Send OTP for login — candidate must already be registered
export const sendLoginOtp = async (req, res) => {
  try {
    const { identifier, mobile, preferredChannel } = req.body;
    const input = String(identifier || mobile || "").trim();

    if (!input) {
      return res.status(422).json({
        isOk: false,
        status: 422,
        message: "Mobile number, Email address, or Registration ID is required",
      });
    }

    let query = {};
    if (/^\d{10}$/.test(input)) {
      query = { mobile: input };
    } else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)) {
      query = { email: input.toLowerCase() };
    } else {
      query = { registration_id: input.toUpperCase() };
    }

    // Candidate lookup for login
    const candidate = await Candidate.findOne(query).select("_id mobile email registration_id name");

    if (candidate) {
      if (!checkOtpRate(`login:${candidate._id.toString()}`))
        return res.status(429).json({
          isOk: false,
          status: 429,
          message: "Too many OTP requests. Try again in 1 hour.",
        });

      const otp = generateOtp();
      const expires_at = Date.now() + OTP_EXPIRE_MS;

      req.session.candidateOtp = {
        target: input,
        candidateId: candidate._id.toString(),
        type: "login",
        hash: crypto.createHash("sha256").update(otp).digest("hex"),
        expires_at,
        attempts: 0,
      };

      await deliverOtp({
        mobile: candidate.mobile,
        email: candidate.email,
        otp,
        trigger: "otp_login",
        preferredChannel,
      }).catch((err) => {
        console.error("[OTP] login delivery error:", err.message);
        return { channel: "none", error: err.message };
      });

      if (isDevOtpEnabled() && process.env.NODE_ENV !== "production") {
        console.log(`[DEV OTP LOG] Generated OTP: ${otp}`);
      }
    } else {
      // Dummy processing to equalize execution timing and prevent account enumeration timing attacks
      crypto.createHash("sha256").update("dummy_salt_" + input).digest("hex");
    }

    return res.status(200).json({
      isOk: true,
      status: 200,
      message: "If an account matches those details, an OTP has been sent.",
    });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

// Verify login OTP — creates candidate session
export const verifyLoginOtp = async (req, res) => {
  try {
    const { identifier, mobile, otp } = req.body;
    const input = String(identifier || mobile || "").trim();

    if (!input || !isValidOtp(otp))
      return res.status(422).json({
        isOk: false,
        status: 422,
        message: "A valid login identifier and 6-digit OTP are required",
      });

    const stored = req.session.candidateOtp;

    if (!stored || stored.type !== "login")
      return res.status(400).json({
        isOk: false,
        status: 400,
        message: "No pending OTP for this login request",
      });

    if (Date.now() > stored.expires_at) {
      delete req.session.candidateOtp;
      return res
        .status(400)
        .json({ isOk: false, status: 400, message: "OTP has expired" });
    }

    if (stored.attempts >= MAX_VERIFY_ATTEMPTS) {
      delete req.session.candidateOtp;
      return res.status(429).json({
        isOk: false,
        status: 429,
        message: "Too many incorrect attempts. Request a new OTP.",
      });
    }

    stored.attempts += 1;

    const inputHash = crypto.createHash("sha256").update(otp).digest("hex");
    const storedHashBuf = Buffer.from(stored.hash, "hex");
    const inputHashBuf = Buffer.from(inputHash, "hex");

    const match =
      storedHashBuf.length === inputHashBuf.length &&
      crypto.timingSafeEqual(storedHashBuf, inputHashBuf);

    if (!match)
      return res
        .status(401)
        .json({ isOk: false, status: 401, message: "Invalid OTP" });

    let query = {};
    if (/^\d{10}$/.test(input)) {
      query = { mobile: input };
    } else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)) {
      query = { email: input.toLowerCase() };
    } else {
      query = { registration_id: input.toUpperCase() };
    }

    let candidate = await Candidate.findOne(query).select(
      "_id registration_id name",
    );
    if (!candidate && stored?.candidateId) {
      candidate = await Candidate.findById(stored.candidateId).select(
        "_id registration_id name",
      );
    }

    if (!candidate)
      return res.status(401).json({
        isOk: false,
        status: 401,
        message: "No candidate account found",
      });

    delete req.session.candidateOtp;

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

    req.session.cookie.maxAge = CANDIDATE_SESSION_MS;

    return res.status(200).json({
      isOk: true,
      status: 200,
      message: "Login successful",
      data: {
        registration_id: candidate.registration_id,
        name: candidate.name,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

// Verify password reset OTP — sets req.session.otpVerified on success
export const verifyPasswordResetOtp = async (req, res) => {
  try {
    const { registration_id, otp } = req.body;
    if (!registration_id || !otp)
      return res.status(422).json({
        isOk: false,
        status: 422,
        message: "registration_id and otp are required",
      });

    const stored = req.session.candidateOtp;
    if (
      !stored ||
      stored.target !== registration_id ||
      stored.type !== "password_reset"
    )
      return res.status(400).json({
        isOk: false,
        status: 400,
        message: "No pending OTP for this registration ID",
      });

    if (Date.now() > stored.expires_at) {
      delete req.session.candidateOtp;
      return res
        .status(400)
        .json({ isOk: false, status: 400, message: "OTP has expired" });
    }

    if (stored.attempts >= MAX_VERIFY_ATTEMPTS) {
      delete req.session.candidateOtp;
      return res.status(429).json({
        isOk: false,
        status: 429,
        message: "Too many incorrect attempts. Request a new OTP.",
      });
    }

    stored.attempts += 1;

    const inputHash = crypto.createHash("sha256").update(otp).digest("hex");
    const storedHashBuf = Buffer.from(stored.hash, "hex");
    const inputHashBuf = Buffer.from(inputHash, "hex");

    const match =
      storedHashBuf.length === inputHashBuf.length &&
      crypto.timingSafeEqual(storedHashBuf, inputHashBuf);

    if (!match)
      return res
        .status(401)
        .json({ isOk: false, status: 401, message: "Invalid OTP" });

    delete req.session.candidateOtp;
    req.session.otpVerified = registration_id;

    return res
      .status(200)
      .json({ isOk: true, status: 200, message: "OTP verified" });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};
