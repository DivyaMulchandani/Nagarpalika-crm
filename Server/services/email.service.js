import { Writable } from "stream";
import nodemailer from "nodemailer";
import EmailSetup from "../models/EmailSetup.js";
import EmailFor from "../models/EmailFor.js";
import EmailTemplate from "../models/EmailTemplate.js";

const buildTransporter = (smtp) => {
  if (!smtp?.host) {
    const host = process.env.SMTP_HOST || "127.0.0.1";
    const port = parseInt(process.env.SMTP_PORT || "25");
    const secure = process.env.SMTP_SECURE === "true";

    const options = {
      host,
      port,
      secure,
      tls: {
        rejectUnauthorized: false,
      },
    };

    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      options.auth = {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      };
    }

    return nodemailer.createTransport(options);
  }

  if (smtp.host.toLowerCase().includes("gmail")) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user: smtp.email, pass: smtp.appPassword },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  const options = {
    host: smtp.host,
    port: smtp.port || 25,
    secure: smtp.SSL || false,
    tls: {
      rejectUnauthorized: false,
    },
  };

  if (smtp.email && smtp.appPassword) {
    options.auth = {
      user: smtp.email,
      pass: smtp.appPassword,
    };
  }

  return nodemailer.createTransport(options);
};

const substitute = (str, vars) =>
  Object.entries(vars).reduce(
    (s, [k, v]) => s.replaceAll(`{{${k}}}`, String(v ?? "")),
    str,
  );

/**
 * Send a plain email using the active EmailSetup record or local Postfix / .env SMTP fallback.
 */
export const sendEmail = async ({
  to,
  subject,
  html,
  text,
  attachments = [],
}) => {
  const smtp = await EmailSetup.findOne({ isActive: true })
    .select("+appPassword")
    .lean();
  const transport = buildTransporter(smtp);
  const defaultFrom =
    process.env.SMTP_FROM ||
    process.env.SMTP_USER ||
    "admin@onlinejobportal.org";
  const from = smtp?.email
    ? `"${smtp.mailerName || "Nagar Palika Recruitment"}" <${smtp.email}>`
    : `"Nagar Palika Recruitment" <${defaultFrom}>`;
  return await transport.sendMail({ from, to, subject, html, text, attachments });
};

/**
 * Look up an EmailFor record by templateKey string, find its linked EmailTemplate,
 * substitute {{VARIABLE}} placeholders in subject and body, then send.
 * Uses the template's own emailFrom (EmailSetup) for SMTP, falling back to local Postfix if unconfigured.
 */
export const sendTemplatedEmail = async (
  templateKey,
  to,
  variables = {},
  attachments = [],
) => {
  const emailFor = await EmailFor.findOne({ emailFor: templateKey }).lean();
  if (!emailFor) throw new Error(`Email type not found: ${templateKey}`);

  const template = await EmailTemplate.findOne({
    emailFor: emailFor._id,
    isActive: true,
  })
    .populate({ path: "emailFrom", select: "+appPassword" })
    .lean();
  if (!template) throw new Error(`No active template for: ${templateKey}`);

  const html = substitute(template.emailSignature, variables);
  const subject = substitute(template.emailSubject, variables);
  const smtp = template.emailFrom;

  const transport = buildTransporter(smtp);
  const defaultFrom =
    process.env.SMTP_FROM ||
    process.env.SMTP_USER ||
    "admin@onlinejobportal.org";
  const fromEmail = smtp?.email || defaultFrom;
  const mailerName = template.mailerName || "Nagar Palika Recruitment";

  return await transport.sendMail({
    from: `"${mailerName}" <${fromEmail}>`,
    to,
    cc: template.emailCC || undefined,
    bcc: template.emailBCC || undefined,
    subject,
    html,
    attachments,
  });
};

/**
 * Stream a PDF generator into a Buffer for use as an email attachment.
 * generateFn must accept (data, writable) and return a Promise.
 */
export const pdfToBuffer = (generateFn, data) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    const sink = new Writable({
      write(chunk, _enc, cb) {
        chunks.push(chunk);
        cb();
      },
    });
    sink.on("finish", () => resolve(Buffer.concat(chunks)));
    sink.on("error", reject);
    generateFn(data, sink).catch(reject);
  });
