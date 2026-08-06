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

const imageDefault = 5 * 1024 * 1024;
const documentDefault = 10 * 1024 * 1024;

export const uploadLimits = {
  photoMaxBytes: parsePositiveInt(
    process.env.MAX_PHOTO_SIZE || process.env.MAX_IMAGE_SIZE,
    imageDefault,
  ),
  signatureMaxBytes: parsePositiveInt(
    process.env.MAX_SIGNATURE_SIZE || process.env.MAX_IMAGE_SIZE,
    imageDefault,
  ),
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
  otp: {
    maxVerifyAttempts: otpSettings.maxVerifyAttempts,
    primaryChannel: otpSettings.primaryChannel,
    fallbackChain: otpSettings.fallbackChain,
  },
});
