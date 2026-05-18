import Otp from "../../models/Otp.js";
import Employee from "../../models/Employee.js";
import CompanyMaster from "../../models/CompanyMaster.js";
import EmailTemplate from "../../models/EmailTemplate.js";
import EmailFor from "../../models/EmailFor.js";
import nodemailer from "nodemailer";
import bcrypt from "bcrypt";
import crypto from "crypto";

const MAX_OTP_ATTEMPTS = 5;

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

    // Create new OTP
    await Otp.create({
      email,
      otp,
      createdAt: new Date(),
    });

    // Find email template for forgot password
    const forgotPasswordType = await EmailFor.findOne({
      emailFor: "Forget Password",
    });
    if (!forgotPasswordType) {
      return res.status(404).json({
        isOk: false,
        message: "Email template type not found",
      });
    }

    // Get email template
    const emailTemplate = await EmailTemplate.findOne({
      emailFor: forgotPasswordType._id,
      isActive: true,
    }).populate({ path: "emailFrom", select: "+appPassword" });

    if (!emailTemplate) {
      return res.status(404).json({
        isOk: false,
        message: "Email template not found",
      });
    }

    // Replace template variables in email body
    let emailBody = emailTemplate.emailSignature;
    const username = user.employeeName || "Admin";
    emailBody = emailBody.replace("{{USERNAME}}", username);
    emailBody = emailBody.replace("{{OTP_CODE}}", otp);
    emailTemplate.emailSignature = emailBody;

    // Create transporter
    let transporter;
    try {
      // Set up configuration based on email provider
      if (emailTemplate.emailFrom.host.toLowerCase().includes("gmail")) {
        transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: emailTemplate.emailFrom.email,
            pass: emailTemplate.emailFrom.appPassword,
          },
        });
      } else {
        transporter = nodemailer.createTransport({
          host: emailTemplate.emailFrom.host,
          port: emailTemplate.emailFrom.port,
          secure: emailTemplate.emailFrom.SSL,
          auth: {
            user: emailTemplate.emailFrom.email,
            pass: emailTemplate.emailFrom.appPassword,
          },
        });
      }

      // Send email
      await transporter.sendMail({
        from: `"${emailTemplate.mailerName}" <${emailTemplate.emailFrom.email}>`,
        to: email,
        cc: emailTemplate.emailCC || "",
        bcc: emailTemplate.emailBCC || "",
        subject: emailTemplate.emailSubject,
        html: emailTemplate.emailSignature,
      });

      console.log("Email sent successfully");

      return res.status(200).json({
        isOk: true,
        message: "OTP sent to your email",
      });
    } catch (emailError) {
      console.error("Error sending email:", emailError);
      return res.status(500).json({
        isOk: false,
        message: "Failed to send OTP email",
        error: emailError.message,
      });
    }
  } catch (error) {
    console.error("Error in createOtp:", error);
    return res.status(500).json({
      isOk: false,
      message: "Failed to send OTP",
      error: error.message,
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

    if (otpRecord.otp !== otp) {
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
    console.error("Error in verifyOtp:", error);
    return res.status(500).json({
      isOk: false,
      message: "Failed to verify OTP",
      error: error.message,
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

    if (otpRecord.otp !== otp) {
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
    console.error("Error in resetPassword:", error);
    return res.status(500).json({
      isOk: false,
      message: "Failed to reset password",
      error: error.message,
    });
  }
};
