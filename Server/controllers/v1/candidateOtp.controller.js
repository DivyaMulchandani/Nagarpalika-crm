import crypto from "crypto";
import Candidate from "../../models/Candidate.js";

// In-memory rate limiter: target → { count, windowStart }
const otpRateMap = new Map();
const OTP_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const OTP_PER_WINDOW = 3;
const OTP_EXPIRE_MS = 10 * 60 * 1000; // 10 minutes
const MAX_VERIFY_ATTEMPTS = 3;

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

// Send OTP to candidate mobile (pre-registration — verified by phone number)
export const sendCandidateOtp = async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile)
      return res
        .status(422)
        .json({ isOk: false, status: 422, message: "mobile is required" });

    if (!checkOtpRate(mobile))
      return res
        .status(429)
        .json({
          isOk: false,
          status: 429,
          message: "Too many OTP requests. Try again in 1 hour.",
        });

    const otp = generateOtp();
    const expires_at = Date.now() + OTP_EXPIRE_MS;

    // Store in session — never log OTP value
    req.session.candidateOtp = {
      target: mobile,
      type: "mobile",
      hash: crypto.createHash("sha256").update(otp).digest("hex"),
      expires_at,
      attempts: 0,
    };

    // TODO Phase 8: deliver otp via SMS to mobile
    if (process.env.NODE_ENV !== "production") {
      console.log(
        `[CANDIDATE OTP] mobile=${mobile} — delivery pending SMS integration`,
      );
    }

    return res
      .status(200)
      .json({
        isOk: true,
        status: 200,
        message: "OTP sent to your mobile number",
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
    if (!mobile || !otp)
      return res
        .status(422)
        .json({
          isOk: false,
          status: 422,
          message: "mobile and otp are required",
        });

    const stored = req.session.candidateOtp;
    if (!stored || stored.target !== mobile || stored.type !== "mobile")
      return res
        .status(400)
        .json({
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
      return res
        .status(429)
        .json({
          isOk: false,
          status: 429,
          message: "Too many incorrect attempts. Request a new OTP.",
        });
    }

    stored.attempts += 1;

    const inputHash = crypto.createHash("sha256").update(otp).digest("hex");
    const storedHashBuf = Buffer.from(stored.hash, "hex");
    const inputHashBuf = Buffer.from(inputHash, "hex");

    // Constant-time comparison to prevent timing attacks
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
    const { registration_id } = req.body;
    if (!registration_id)
      return res
        .status(422)
        .json({
          isOk: false,
          status: 422,
          message: "registration_id is required",
        });

    // Enumeration-safe: identical response regardless of whether candidate exists
    const candidate = await Candidate.findOne({ registration_id }).select(
      "mobile email",
    );

    if (candidate && !checkOtpRate(registration_id))
      return res
        .status(429)
        .json({
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

      // TODO Phase 8: deliver otp via SMS + email
      if (process.env.NODE_ENV !== "production") {
        console.log(
          `[RESET OTP] registration_id=${registration_id} — delivery pending SMS/email integration`,
        );
      }
    }

    return res
      .status(200)
      .json({
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

// Verify password reset OTP — sets req.session.otpVerified on success
export const verifyPasswordResetOtp = async (req, res) => {
  try {
    const { registration_id, otp } = req.body;
    if (!registration_id || !otp)
      return res
        .status(422)
        .json({
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
      return res
        .status(400)
        .json({
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
      return res
        .status(429)
        .json({
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
