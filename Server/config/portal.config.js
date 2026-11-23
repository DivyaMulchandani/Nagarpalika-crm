/**
 * Portal-wide configuration read from environment variables.
 */
const parsePositiveInt = (value, fallback) => {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const formatFileSize = (bytes) => {
  if (bytes >= 1024 * 1024) {
    const mb = bytes / (1024 * 1024);
    return Number.isInteger(mb) ? `${mb} MB` : `${mb.toFixed(1)} MB`;
  }
  return `${Math.round(bytes / 1024)} KB`;
};

// Candidate photo and signature must already be the right size when uploaded:
// the portal never resizes or crops them (the candidate prepares the file, so
// nothing they framed is cut off). Anything outside these rules is refused with
// a message saying what to fix. Keep in step with Web/src/utils/candidateImage.js.
// ratio = width / height.
export const candidateImageSpecs = {
  photo: {
    minBytes: 10 * 1024,
    maxBytes: parsePositiveInt(process.env.MAX_PHOTO_SIZE, 250 * 1024),
    minWidth: 200, maxWidth: 600,
    minHeight: 250, maxHeight: 800,
    minRatio: 0.65, maxRatio: 0.9,      // portrait, passport 3.5 x 4.5 cm = 0.78
  },
  signature: {
    minBytes: 5 * 1024,
    maxBytes: parsePositiveInt(process.env.MAX_SIGNATURE_SIZE, 150 * 1024),
    minWidth: 200, maxWidth: 800,
    minHeight: 60, maxHeight: 300,
    minRatio: 2, maxRatio: 5,           // landscape, about 3 : 1
  },
};

// A scanned certificate (caste / UDID / application document) fits in 2 MB.
const documentDefault = 2 * 1024 * 1024;

export const uploadLimits = {
  photoMaxBytes: candidateImageSpecs.photo.maxBytes,
  signatureMaxBytes: candidateImageSpecs.signature.maxBytes,
  documentMaxBytes: parsePositiveInt(
    process.env.MAX_DOCUMENT_SIZE,
    documentDefault,
  ),
};

export const otpSettings = {
  get maxVerifyAttempts() {
    return parsePositiveInt(process.env.OTP_MAX_ATTEMPTS, 3);
  },
  get expireMinutes() {
    return parsePositiveInt(process.env.OTP_EXPIRE_MINUTES, 10);
  },
  get cooldownMinutes() {
    return parsePositiveInt(process.env.OTP_COOLDOWN_MINUTES, 15);
  },
  get perHourLimit() {
    return parsePositiveInt(process.env.OTP_PER_HOUR_LIMIT, 3);
  },
  get primaryChannel() {
    return (process.env.OTP_PRIMARY_CHANNEL || "email").toLowerCase();
  },
  get enableFallback() {
    return process.env.OTP_ENABLE_FALLBACK === "true";
  },
  get fallbackChain() {
    return (process.env.OTP_FALLBACK_CHAIN || "email,whatsapp,sms")
      .toLowerCase()
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
  },
};

export const getPortalConfigPayload = () => ({
  uploadLimits: {
    photoMaxBytes: uploadLimits.photoMaxBytes,
    photoMaxLabel: formatFileSize(uploadLimits.photoMaxBytes),
    signatureMaxBytes: uploadLimits.signatureMaxBytes,
    signatureMaxLabel: formatFileSize(uploadLimits.signatureMaxBytes),
    documentMaxBytes: uploadLimits.documentMaxBytes,
    documentMaxLabel: formatFileSize(uploadLimits.documentMaxBytes),
  },
  imageSpecs: candidateImageSpecs,
  otp: {
    maxVerifyAttempts: otpSettings.maxVerifyAttempts,
    primaryChannel: otpSettings.primaryChannel,
    fallbackChain: otpSettings.fallbackChain,
  },
});
