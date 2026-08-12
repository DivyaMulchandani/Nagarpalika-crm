/**
 * Security Headers Middleware
 * Implements OWASP security headers best practices:
 * - Helmet for standard security headers
 * - CORS configuration
 * - Content Security Policy
 * - Additional XSS, Clickjacking protection
 *
 * OWASP Security Headers:
 * https://owasp.org/www-project-secure-headers/
 */

import helmet from "helmet";
import rateLimit from "express-rate-limit";

const rateLimitResponse = {
  isOk: false,
  status: 429,
  message: "Too many requests, please try again later",
};

export const publicApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitResponse,
});

export const helpQueryLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitResponse,
});

/**
 * Configure Helmet security headers
 */
const S3_BASE = process.env.S3_PUBLIC_BASE_URL?.replace(/\/$/, "");

export const securityHeaders = helmet({
  // Content-Security-Policy: Helps prevent XSS attacks
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
        "https://unpkg.com",
      ],
      styleSrcElem: [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
        "https://unpkg.com",
      ],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "https://unpkg.com",
      ],
      scriptSrcElem: [
        "'self'",
        "'unsafe-inline'",
        "https://unpkg.com",
      ],
      imgSrc: [
        "'self'",
        "data:",
        "blob:",
        "https://*.amazonaws.com",
        "https://*.s3.amazonaws.com",
        ...(S3_BASE ? [S3_BASE] : []),
      ],
      connectSrc: [
        "'self'",
        "data:",
        "blob:",
        "https://*.amazonaws.com",
        "https://*.s3.amazonaws.com",
        ...(S3_BASE ? [S3_BASE] : []),
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "data:",
      ],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },

  // X-Content-Type-Options: Prevent MIME type sniffing
  noSniff: true,

  // X-Frame-Options: Prevent clickjacking
  frameguard: {
    action: "deny",
  },

  // Strict-Transport-Security: Force HTTPS
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },

  // X-XSS-Protection: Additional XSS protection
  xssFilter: true,

  // Referrer-Policy: Control referrer information
  referrerPolicy: {
    policy: "strict-origin-when-cross-origin",
  },

  // X-Permitted-Cross-Domain-Policies: Prevent Adobe Flash/Acrobat cross-domain
  permittedCrossDomainPolicies: {
    permittedPolicies: "none",
  },

  // X-Download-Options: Prevent IE from executing downloads
  ieNoOpen: true,

  // X-DNS-Prefetch-Control: Control DNS prefetching
  dnsPrefetchControl: {
    allow: false,
  },

  // Remove X-Powered-By header
  hidePoweredBy: true,
});

/**
 * Additional security headers not covered by Helmet
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const additionalSecurityHeaders = (req, res, next) => {
  // Permissions-Policy: Control browser features
  res.setHeader(
    "Permissions-Policy",
    "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
  );

  // Cache-Control: Prevent caching of sensitive data
  if (req.path.includes("/api/")) {
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");
  }

  next();
};

/**
 * CORS configuration for production
 * @param {string[]} allowedOrigins - Array of allowed origins
 * @returns {Object} CORS configuration object
 */
export const getCorsConfig = (allowedOrigins = []) => {
  const envOrigins = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const origins = [...new Set([...envOrigins, ...allowedOrigins])];
  const allowAll = origins.includes("*");

  return {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);

      if (allowAll || origins.includes(origin)) {
        return callback(null, true);
      }

      console.warn(`[CORS] Blocked request from origin: ${origin}`);
      return callback(new Error("Not allowed by CORS"), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
    ],
    exposedHeaders: ["Content-Disposition"],
    maxAge: 86400, // Cache preflight for 24 hours
  };
};

/**
 * Request body size limiter middleware
 * Prevents large payload attacks
 * @param {number} limit - Size limit in bytes
 * @returns {Function} Express middleware
 */
export const bodySizeLimit = (limit = 1024 * 1024) => {
  // Default 1MB
  return (req, res, next) => {
    const contentLength = parseInt(req.headers["content-length"] || "0", 10);

    if (contentLength > limit) {
      return res.status(413).json({
        isOk: false,
        status: 413,
        error: "Payload Too Large",
        message: `Request body exceeds ${limit / 1024}KB limit`,
      });
    }

    next();
  };
};

/**
 * Sanitize error messages to prevent information leakage
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
/**
 * Sanitize error messages to prevent information leakage
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const sanitizeErrors = (err, req, res, next) => {
  // Log the full error server-side for debugging
  console.error("[ERROR]", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  const isProduction = process.env.NODE_ENV === "production";

  // Handle CastError / malformed query parameters
  if (
    err.name === "CastError" ||
    err.name === "BSONError" ||
    err.message?.includes("Cast to")
  ) {
    return res.status(400).json({
      isOk: false,
      status: 400,
      error: "Bad Request",
      message: "Invalid parameter or query format",
    });
  }

  // Handle Mongoose / schema validation errors
  if (err.name === "ValidationError") {
    return res.status(400).json({
      isOk: false,
      status: 400,
      error: "Validation Error",
      message: "Invalid input data",
    });
  }

  if (err.name === "MongoServerError" && err.code === 11000) {
    return res.status(409).json({
      isOk: false,
      status: 409,
      error: "Duplicate Entry",
      message: "A record with this information already exists",
    });
  }

  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      isOk: false,
      status: 401,
      error: "Authentication Error",
      message: "Invalid or expired token",
    });
  }

  // Generic sanitized error response (never leak internal Mongoose/MongoDB messages)
  res.status(err.status || 500).json({
    isOk: false,
    status: err.status || 500,
    error: isProduction ? "Internal Server Error" : err.name || "Internal Server Error",
    message: "An unexpected error occurred",
  });
};

/**
 * Controller error handler helper to return clean sanitized errors
 */
export const handleSafeError = (
  res,
  error,
  defaultMessage = "An unexpected error occurred",
  statusCode = 500,
) => {
  console.error("[CONTROLLER ERROR]", error?.message || error);
  if (
    error?.name === "CastError" ||
    error?.name === "BSONError" ||
    error?.message?.includes("Cast to")
  ) {
    return res.status(400).json({
      isOk: false,
      status: 400,
      message: "Invalid parameter or query format",
    });
  }
  if (error?.name === "ValidationError") {
    return res.status(400).json({
      isOk: false,
      status: 400,
      message: "Invalid input data",
    });
  }
  if (error?.name === "MongoServerError" && error?.code === 11000) {
    return res.status(409).json({
      isOk: false,
      status: 409,
      message: "A record with this information already exists",
    });
  }
  return res.status(statusCode).json({
    isOk: false,
    status: statusCode,
    message: defaultMessage,
  });
};

export default {
  securityHeaders,
  additionalSecurityHeaders,
  getCorsConfig,
  bodySizeLimit,
  sanitizeErrors,
  handleSafeError,
};
