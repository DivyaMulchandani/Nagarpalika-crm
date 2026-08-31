import Otp from "../../models/Otp.js";
import Employee from "../../models/Employee.js";
import CompanyMaster from "../../models/CompanyMaster.js";
import EmailTemplate from "../../models/EmailTemplate.js";
import EmailFor from "../../models/EmailFor.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { otpSettings } from "../../config/portal.config.js";
import { sendTemplatedEmail } from "../../services/email.service.js";
import { deliverOtp } from "../../services/notification.service.js";

const MAX_OTP_ATTEMPTS = otpSettings.maxVerifyAttempts;

export const createOtp = async (req, res) => {
  try {
    const { email } = req.body;

    let user = null;

    user = await Employee.findOne({ emailOffice: email });

    if (!user) {
      user = await CompanyMaster.findOne({ email });
    }

    if (!user) {
      return res.status(400).json({
        isOk: false,
        message: "User not found",
      });
    }

    // Check if an OTP was recently sent (within the last minute)
    const existingOtp = await Otp.findOne({ email });
    if (existingOtp) {
      const timeDiff = Date.now() - existingOtp.createdAt.getTime();
      const cooldownPeriod = 60 * 1000; // 1 minute in milliseconds

      if (timeDiff < cooldownPeriod) {
        const remainingTime = Math.ceil((cooldownPeriod - timeDiff) / 1000);
        return res.status(429).json({
          isOk: false,
          message: `Please wait ${remainingTime} seconds before requesting a new OTP`,
          remainingTime: remainingTime,
        });
      }

      // Delete the previous OTP if it exists and cooldown has passed
      await Otp.deleteOne({ email });
    }

    // Generate OTP using cryptographic randomness
    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    // Create new OTP with hashed value
    await Otp.create({
      email,
      otp: otpHash,
      createdAt: new Date(),
    });

    const username = user.employeeName || user.companyName || "Admin";

    try {
      // Try sending via DB EmailTemplate first
      await sendTemplatedEmail("Forget Password", email, {
        USERNAME: username,
        OTP_CODE: otp,
      });
    } catch (templateError) {
      console.warn(
        "[OTP] Templated email failed, falling back to multi-channel deliverOtp:",
        templateError.message,
      );
      // Fallback to central deliverOtp router (Email / Postfix / SMS / WhatsApp)
      await deliverOtp({
        email,
        mobile: user.mobile || user.phone,
        otp,
        trigger: "otp_password_reset",
        preferredChannel: "email",
      });
    }

    return res.status(200).json({
      isOk: true,
      message: "OTP sent successfully to your email",
    });
  } catch (error) {
    console.error("[otp] createOtp error:", error);
    return res.status(500).json({
      isOk: false,
      message: "An unexpected error occurred",
    });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const otpRecord = await Otp.findOne({ email });

    if (!otpRecord) {
      return res.status(400).json({
        isOk: false,
        message: "OTP not found or expired. Please request a new OTP.",
      });
    }

    // Check if OTP is expired (older than 10 minutes)
    const otpAge = Date.now() - otpRecord.createdAt.getTime();
    if (otpAge > 10 * 60 * 1000) {
      // 10 minutes in milliseconds
      // Delete expired OTP
      await Otp.deleteOne({ email });

      return res.status(400).json({
        isOk: false,
        message: "OTP has expired. Please request a new OTP.",
      });
    }

    const inputHash = crypto.createHash("sha256").update(otp || "").digest("hex");
    const storedBuf = Buffer.from(otpRecord.otp, "hex");
    const inputBuf = Buffer.from(inputHash, "hex");

    const match =
      storedBuf.length === inputBuf.length &&
      crypto.timingSafeEqual(storedBuf, inputBuf);

    if (!match) {
      otpRecord.attempts = (otpRecord.attempts || 0) + 1;
      if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
        await Otp.deleteOne({ email });
        return res.status(400).json({
          isOk: false,
          message: "Too many invalid attempts. Please request a new OTP.",
        });
      }
      await otpRecord.save();
      return res.status(400).json({
        isOk: false,
        message: "Invalid OTP",
      });
    }

    // OTP is valid
    return res.status(200).json({
      isOk: true,
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.error("[otp] verifyOtp error:", error);
    return res.status(500).json({
      isOk: false,
      message: "An unexpected error occurred",
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    // Verify OTP again for security
    const otpRecord = await Otp.findOne({ email });

    if (!otpRecord) {
      return res.status(400).json({
        isOk: false,
        message: "Invalid OTP",
      });
    }

    const inputHash = crypto.createHash("sha256").update(otp || "").digest("hex");
    const storedBuf = Buffer.from(otpRecord.otp, "hex");
    const inputBuf = Buffer.from(inputHash, "hex");

    const match =
      storedBuf.length === inputBuf.length &&
      crypto.timingSafeEqual(storedBuf, inputBuf);

    if (!match) {
      otpRecord.attempts = (otpRecord.attempts || 0) + 1;
      if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
        await Otp.deleteOne({ email });
        return res.status(400).json({
          isOk: false,
          message: "Too many invalid attempts. Please request a new OTP.",
        });
      }
      await otpRecord.save();
      return res.status(400).json({
        isOk: false,
        message: "Invalid OTP",
      });
    }

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
      return res.status(400).json({
        isOk: false,
        message: "New password must be at least 8 characters",
      });
    }

    // Find user - first try with emailOffice for Employee
    let user = await Employee.findOne({ emailOffice: email });
    // let isEmployee = true;

    // If not found, try with email for CompanyMaster
    if (!user) {
      user = await CompanyMaster.findOne({ email });
      // isEmployee = false;
    }

    if (!user) {
      return res.status(400).json({
        isOk: false,
        message: "User not found",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    user.password = hashedPassword;
    await user.save();

    // Delete OTP after successful password reset
    await Otp.deleteOne({ email });

    return res.status(200).json({
      isOk: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("[otp] resetPassword error:", error);
    return res.status(500).json({
      isOk: false,
      message: "An unexpected error occurred",
    });
  }
};
