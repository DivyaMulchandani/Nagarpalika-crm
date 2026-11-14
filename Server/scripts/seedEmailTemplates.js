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
import { EMAIL_TEMPLATES } from "../services/emailDefaults.js";

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
  for (const t of EMAIL_TEMPLATES) {
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
  for (const t of EMAIL_TEMPLATES) {
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
