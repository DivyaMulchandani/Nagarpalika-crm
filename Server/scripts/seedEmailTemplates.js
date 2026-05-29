/**
 * Nagar Palika Recruitment Portal — Email Templates Seed
 * =======================================================
 * Seeds EmailFor records and (if an active EmailSetup exists)
 * placeholder EmailTemplate records for all recruitment lifecycle events.
 *
 * Usage: node scripts/seedEmailTemplates.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const MONGO_URI = process.env.DATABASE;

// ─── Inline Schemas ──────────────────────────────────────────────────────────

const EmailSetupSchema = new mongoose.Schema(
  {
    email: String,
    appPassword: { type: String, select: false },
    SSL: Boolean,
    port: Number,
    host: String,
    isActive: Boolean,
  },
  { timestamps: true },
);
const EmailForSchema = new mongoose.Schema(
  {
    emailFor: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);
const EmailTemplateSchema = new mongoose.Schema(
  {
    templateName: String,
    emailFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmailSetup",
      required: true,
    },
    emailFor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmailFor",
      required: true,
    },
    mailerName: String,
    emailCC: { type: String, default: "" },
    emailBCC: { type: String, default: "" },
    emailSubject: String,
    emailSignature: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const EmailSetup = mongoose.model("EmailSetup", EmailSetupSchema);
const EmailFor = mongoose.model("EmailFor", EmailForSchema);
const EmailTemplate = mongoose.model("EmailTemplate", EmailTemplateSchema);

// ─── Template Definitions ─────────────────────────────────────────────────────

const TEMPLATES = [
  {
    key: "registration_id_issued",
    subject: "Your Registration ID — Nagar Palika Recruitment Portal",
    body: `<p>Dear {{NAME}},</p>
<p>Your OTR registration is complete.</p>
<p><strong>Registration ID:</strong> {{REGISTRATION_ID}}</p>
<p>Please save this ID — you will need it to apply for posts and download your admit card.</p>
<p>Login at: {{PORTAL_URL}}</p>
<p>Regards,<br>Nagar Palika Recruitment Cell</p>`,
  },
  {
    key: "application_submitted",
    subject: "Application Submitted — {{POST_TITLE}}",
    body: `<p>Dear {{NAME}},</p>
<p>Your application has been submitted successfully.</p>
<ul>
  <li><strong>Application Ref No:</strong> {{APPLICATION_REF_NO}}</li>
  <li><strong>Advertisement No:</strong> {{ADVT_NO}}</li>
  <li><strong>Post:</strong> {{POST_TITLE}}</li>
</ul>
<p>Please complete your fee payment to confirm your application.</p>
<p>Login at: {{PORTAL_URL}}</p>
<p>Regards,<br>Nagar Palika Recruitment Cell</p>`,
  },
  {
    key: "fee_receipt",
    subject: "Fee Payment Confirmation — {{ADVT_NO}}",
    body: `<p>Dear {{NAME}},</p>
<p>Your application fee payment has been received.</p>
<ul>
  <li><strong>Registration ID:</strong> {{REGISTRATION_ID}}</li>
  <li><strong>Advertisement No:</strong> {{ADVT_NO}}</li>
  <li><strong>Receipt No:</strong> {{RECEIPT_NO}}</li>
  <li><strong>Amount Paid:</strong> &#8377;{{AMOUNT}}</li>
</ul>
<p>Please find the receipt attached to this email.</p>
<p>Regards,<br>Nagar Palika Recruitment Cell</p>`,
  },
  {
    key: "call_letter_published",
    subject: "Your Admit Card is Ready — {{ADVT_NO}}",
    body: `<p>Dear {{NAME}},</p>
<p>Your admit card (call letter) for Advertisement No. <strong>{{ADVT_NO}}</strong> is now available for download.</p>
<p><strong>Registration ID:</strong> {{REGISTRATION_ID}}</p>
<p>Download your admit card from: {{PORTAL_URL}}</p>
<p>Please carry a printed copy to the examination centre.</p>
<p>Regards,<br>Nagar Palika Recruitment Cell</p>`,
  },
  {
    key: "bulk_export_ready",
    subject: "Bulk Export Ready — {{ADVT_NO}}",
    body: `<p>The bulk application export for Advertisement No. <strong>{{ADVT_NO}}</strong> is ready.</p>
<p>Download link: {{DOWNLOAD_LINK}}</p>
<p>This link expires in 7 days.</p>
<p>Regards,<br>Nagar Palika Recruitment Portal</p>`,
  },
  {
    key: "otp",
    subject: "Your OTP Code",
    body: `<p>Dear {{NAME}},</p>
<p>Your OTP is: <strong>{{OTP_CODE}}</strong></p>
<p>This code expires in {{EXPIRY_MINUTES}} minutes. Do not share it with anyone.</p>
<p>If you did not request this OTP, please ignore this message.</p>`,
  },
];

// ─── Main ────────────────────────────────────────────────────────────────────

async function seed() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("Connected.\n");

  const smtp = await EmailSetup.findOne({ isActive: true }).lean();
  if (!smtp) {
    console.warn(
      "⚠️  No active EmailSetup found. EmailFor records will be created but",
    );
    console.warn(
      "   EmailTemplate stubs require SMTP setup first. Configure SMTP via",
    );
    console.warn("   the admin UI, then re-run this script.\n");
  }

  console.log("=== Seeding EmailFor records ===");
  const emailForMap = {};
  for (const t of TEMPLATES) {
    const existing = await EmailFor.findOne({ emailFor: t.key });
    if (existing) {
      console.log(`  [SKIP] ${t.key} — already exists`);
      emailForMap[t.key] = existing._id;
    } else {
      const doc = await EmailFor.create({ emailFor: t.key, isActive: true });
      console.log(`  [CREATE] ${t.key}`);
      emailForMap[t.key] = doc._id;
    }
  }

  if (!smtp) {
    console.log(
      "\n✅ EmailFor records seeded. Re-run after SMTP setup to create templates.",
    );
    await mongoose.disconnect();
    return;
  }

  console.log("\n=== Seeding EmailTemplate stubs ===");
  for (const t of TEMPLATES) {
    const existing = await EmailTemplate.findOne({
      emailFor: emailForMap[t.key],
    });
    if (existing) {
      console.log(`  [SKIP] ${t.key} — template already exists`);
      continue;
    }
    await EmailTemplate.create({
      templateName: t.key,
      emailFrom: smtp._id,
      emailFor: emailForMap[t.key],
      mailerName: "Nagar Palika Recruitment",
      emailSubject: t.subject,
      emailSignature: t.body,
      isActive: true,
    });
    console.log(`  [CREATE] ${t.key}`);
  }

  console.log("\n✅ Email templates seeded.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
