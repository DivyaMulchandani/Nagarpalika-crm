import { Writable } from "stream";
import nodemailer from "nodemailer";
import EmailSetup from "../models/EmailSetup.js";
import EmailFor from "../models/EmailFor.js";
import EmailTemplate from "../models/EmailTemplate.js";

const buildTransporter = (smtp) => {
  if (!smtp?.host) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  if (smtp.host.toLowerCase().includes("gmail")) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user: smtp.email, pass: smtp.appPassword },
    });
  }
  return nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.SSL,
    auth: { user: smtp.email, pass: smtp.appPassword },
  });
};

const substitute = (str, vars) =>
  Object.entries(vars).reduce(
    (s, [k, v]) => s.replaceAll(`{{${k}}}`, String(v ?? "")),
    str,
  );

/**
 * Send a plain email using the active EmailSetup record or .env SMTP fallback.
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
  const from = smtp
    ? `"Nagar Palika Recruitment" <${smtp.email}>`
    : `"Nagar Palika Recruitment" <${process.env.SMTP_USER}>`;
  await transport.sendMail({ from, to, subject, html, text, attachments });
};

/**
 * Look up an EmailFor record by templateKey string, find its linked EmailTemplate,
 * substitute {{VARIABLE}} placeholders in subject and body, then send.
 * Uses the template's own emailFrom (EmailSetup) for SMTP.
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
  await transport.sendMail({
    from: `"${template.mailerName}" <${smtp.email}>`,
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
