import express from "express";
import mongoose from "mongoose";
import morgan from "morgan";
import bodyParser from "body-parser";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import hpp from "hpp";
import session from "express-session";
import { setupSwagger } from "./config/swagger.js";

// ============ SECURITY IMPORTS ============
// OWASP-compliant security middleware
import {
  securityHeaders,
  additionalSecurityHeaders,
  getCorsConfig,
  sanitizeErrors,
  publicApiLimiter,
} from "./middlewares/securityHeaders.js";
import { mongoSanitizer } from "./middlewares/inputValidator.js";

// ES6 module equivalent of __dirname and __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

global.__basedir = __dirname;

// Create log directory if it doesn't exist
if (!fs.existsSync("log")) {
  fs.mkdirSync("log");
}

// Global error handling to prevent crashes
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  logError(error);
  // Don't exit the process, let it continue running
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  logError({ message: "Unhandled Promise Rejection", error: reason });
  // Don't exit the process, let it continue running
});

// Function to log errors
function logError(error) {
  let filedata = {
    datetime: new Date(),
    message: error?.message,
    stack: error?.stack,
  };
  try {
    let writecontent = [];
    if (fs.existsSync("log/error.html")) {
      let filedata = fs.readFileSync("log/error.html");
      if (filedata) {
        try {
          writecontent = JSON.parse(filedata);
        } catch {
          // If parsing fails, start with empty array
          writecontent = [];
        }
      }
    }
    writecontent.push(filedata);
    fs.writeFileSync("log/error.html", JSON.stringify(writecontent));
  } catch (err) {
    console.error("Error logging to file:", err);
  }
}

const app = express();
let databasestatus = "In-Progress";

// ============ SECURITY MIDDLEWARE (Apply FIRST) ============
// 1. Security Headers (Helmet + custom headers)
app.use(securityHeaders);
app.use(additionalSecurityHeaders);

// 2. CORS configuration (more restrictive than before)
const corsConfig = getCorsConfig();
app.use(cors(corsConfig));
app.options("*", cors(corsConfig));

// 3. Body Parsing with size limits (OWASP: limit request body size)
// verify callback captures raw body for Razorpay webhook HMAC verification
app.use(
  bodyParser.json({
    limit: "10mb",
    verify: (req, _res, buf) => {
      if (req.path && req.path.includes("/webhooks/")) req.rawBody = buf;
    },
  }),
);
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

// 5. MongoDB NoSQL Injection Protection
app.use(mongoSanitizer);

// 6. HTTP Parameter Pollution Prevention
app.use(hpp());

// 7. Express Session - MongoDB Session Storage (persistent)
import MongoStore from "connect-mongo";

app.use(
  session({
    secret:
      process.env.SESSION_SECRET ||
      "your-super-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    name: "sessionId",
    store: MongoStore.create({
      mongoUrl: process.env.DATABASE,
      collectionName: "sessions",
      ttl: 24 * 60 * 60, // 24 hours in seconds
      autoRemove: "native", // Use MongoDB TTL index for cleanup
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      httpOnly: true, // Prevents XSS attacks
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: "strict", // CSRF protection
    },
  }),
);

console.log("✅ Express session middleware configured (MongoDB storage)");

// NOTE: /uploads intentionally NOT served statically — all file downloads go through authenticated API endpoints.

mongoose.set("strictQuery", false);
if (process.env.NODE_ENV !== "production") mongoose.set("debug", true);

const dbURI = process.env.DATABASE;

mongoose
  .connect(dbURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000,
  })
  .then(() => {
    console.log("✅ DB connected");
    databasestatus = "Connected";
  })
  .catch((err) => {
    console.error("❌ DB Connection Error =>", err);
    if (err instanceof mongoose.Error.MongooseServerSelectionError) {
      console.error(
        "Server selection failed. Check network, URI, and Atlas IP whitelist.",
      );
    }
  });

// Optional: handle runtime disconnects
mongoose.connection.on("disconnected", () => {
  console.warn("⚠️ DB disconnected!");
});

mongoose.connection.on("reconnected", () => {
  console.log("♻️ DB reconnected!");
});

// ============ ADDITIONAL MIDDLEWARE ============
// Development request logging (disable in production for performance)
app.use(morgan("dev"));
app.use(express.static("files"));

// Serve uploaded files (logos, favicons, documents) with cross-origin access
app.use(
  "/uploads",
  (req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  },
  express.static(path.join(__dirname, "uploads")),
);

if (process.env.NODE_ENV !== "production") setupSwagger(app);

// ============ V1 ROUTES ============
// Import v1 routes
import companiesRoutes from "./routes/v1/companies.routes.js";
import departmentsRoutes from "./routes/v1/departments.routes.js";
import emailsRoutes from "./routes/v1/emails.routes.js";
import employeeRolesRoutes from "./routes/v1/employeeRoles.routes.js";
import employeesRoutes from "./routes/v1/employees.routes.js";
import locationsRoutes from "./routes/v1/locations.routes.js";
import menusRoutes from "./routes/v1/menus.routes.js";
import rolesRoutes from "./routes/v1/roles.routes.js";
import otpRoutes from "./routes/v1/otp.routes.js";
import masterDataRoutes from "./routes/v1/masterData.routes.js";
import analyticsRoutes from "./routes/v1/analytics.routes.js";
import advertisementsRoutes from "./routes/v1/advertisements.routes.js";
import candidatesRoutes from "./routes/v1/candidates.routes.js";
import applicationsRoutes from "./routes/v1/applications.routes.js";
import feePaymentsRoutes from "./routes/v1/feePayments.routes.js";
import callLettersRoutes from "./routes/v1/callLetters.routes.js";
import noticesRoutes from "./routes/v1/notices.routes.js";
import helpQueryRoutes from "./routes/v1/helpQuery.routes.js";

// Rate limit all public API reads
app.use("/api/v1/advertisements", publicApiLimiter);
app.use("/api/v1/notices", publicApiLimiter);
app.use("/api/v1/companies/details", publicApiLimiter);

app.use("/api/v1", companiesRoutes);
app.use("/api/v1", departmentsRoutes);
app.use("/api/v1", emailsRoutes);
app.use("/api/v1", employeeRolesRoutes);
app.use("/api/v1", employeesRoutes);
app.use("/api/v1", locationsRoutes);
app.use("/api/v1", menusRoutes);
app.use("/api/v1", rolesRoutes);
app.use("/api/v1", analyticsRoutes);
app.use("/api/v1", advertisementsRoutes);
app.use("/api/v1", candidatesRoutes);
app.use("/api/v1", applicationsRoutes);
app.use("/api/v1", feePaymentsRoutes);
app.use("/api/v1", callLettersRoutes);
app.use("/api/v1", noticesRoutes);
app.use("/api/v1", helpQueryRoutes);
app.use("/api/v1/otp", otpRoutes);
app.use("/api/v1/master-data", masterDataRoutes);

console.log("✅ V1 API routes loaded");

app.get("/api", (req, res) => {
  res.json({
    status: "ok",
    message: "API server is running",
    database: databasestatus,
    timestamp: new Date().toISOString(),
  });
});

app.use("/", express.static(path.join(__dirname, "/out/admin")));

app.get("/*", async (req, res) => {
  res.sendFile(path.join(__dirname, "/out/admin", "index.html"));
});

// ============ ERROR HANDLING ============
// Use the secure error sanitizer (prevents information leakage)
app.use(sanitizeErrors);

// Fallback error handler that logs errors but doesn't expose details
// eslint-disable-next-line no-unused-vars
app.use(async (err, req, res, _next) => {
  // Log error to file for debugging
  const errorData = {
    datetime: new Date().toISOString(),
    message: err?.message,
    path: req?.path,
    method: req?.method,
    ip: req?.ip,
    // Don't log full stack trace to file in production
    stack: process.env.NODE_ENV === "development" ? err?.stack : undefined,
  };

  try {
    let writecontent = [];
    if (fs.existsSync("log/error.html")) {
      const filedata = fs.readFileSync("log/error.html", "utf8");
      if (filedata) {
        try {
          writecontent = JSON.parse(filedata);
        } catch {
          writecontent = [];
        }
      }
    }

    // Keep only last 100 errors to prevent log file from growing too large
    if (writecontent.length > 100) {
      writecontent = writecontent.slice(-100);
    }

    writecontent.push(errorData);
    fs.writeFileSync("log/error.html", JSON.stringify(writecontent, null, 2));
  } catch (logErr) {
    console.error("Error logging to file:", logErr);
  }

  // SECURITY: Don't expose internal error details to users
  const isProduction = process.env.NODE_ENV === "production";
  return res.status(500).json({
    isOk: false,
    status: 500,
    error: "Internal Server Error",
    message: isProduction ? "An unexpected error occurred" : err?.message,
  });
});

const port = process.env.PORT || 8000;

app.listen(port, () => {
  console.log(`✅ Server is running on port ${port}`);
  console.log(
    `🔒 Security middleware enabled: Helmet, Input Validation, CSRF Protection`,
  );
});
