import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

import MasterData from "../models/MasterData.js";

// ── Recruitment Portal Master Data ───────────────────────────────────────────
// These categories populate dropdowns in the OTR registration form and admin panel.
// Add new categories here as required. Existing entries are skipped (not overwritten).

const masterSeedData = [
  // Candidate demographics
  { category: "TITLE",          data: ["Mr.", "Mrs.", "Ms.", "Dr.", "Baby", "Master"] },
  { category: "GENDER",         data: ["Male", "Female", "Other"] },
  { category: "MARITAL_STATUS", data: ["Single", "Married", "Divorced", "Widowed"] },
  { category: "RELIGION",       data: ["Hindu", "Muslim", "Christian", "Sikh", "Jain", "Buddhist", "Parsi", "Other"] },

  // OTR — identity & eligibility
  { category: "ID_PROOF_TYPE",  data: ["Aadhaar", "PAN", "Passport", "Driving License", "Voter ID"] },
  { category: "CATEGORY",       data: ["General", "OBC", "SC", "ST", "EWS"] },
  { category: "PH_TYPE",        data: ["Locomotor / Orthopedic (OL)", "Visual Impairment (LV)", "Hearing Impairment (HH)", "Multiple Disability"] },

  // OTR — education & experience
  { category: "QUALIFICATION",  data: [
    "Below SSC", "SSC (10th)", "HSC (12th)", "ITI", "Diploma",
    "Graduate", "Post Graduate", "Professional Degree (MBBS/BE/LLB etc.)", "PhD"
  ]},
  { category: "EX_SERVICEMAN_TYPE", data: ["Army", "Navy", "Air Force"] },

  // OTR — language proficiency
  { category: "LANGUAGE",       data: ["Gujarati", "Hindi", "English", "Marathi", "Urdu", "Sanskrit", "Other"] },

  // Location (for OTR address form)
  { category: "REFERRAL_SOURCE", data: ["Walk-in", "Newspaper", "Online Advertisement", "Word of Mouth", "Municipality Notice Board"] },

  // Job advertisement
  { category: "JOB_CLASS",      data: ["Class I", "Class II", "Class III", "Class IV"] },
  { category: "ADVT_STATUS",    data: ["Draft", "Published", "Closed", "Archived"] },

  // Fee payment
  { category: "PAYMENT_METHOD", data: ["UPI", "Net Banking", "Debit Card", "Credit Card"] },
  { category: "PAYMENT_STATUS", data: ["Pending", "Paid", "Failed", "Refunded"] },

  // Application
  { category: "APPLICATION_STATUS", data: ["Submitted", "Under Review", "Shortlisted", "Rejected", "Selected"] },

  // Document types (candidate uploads)
  { category: "DOCUMENT_TYPE",  data: ["Photo", "Signature", "Aadhaar Copy", "Caste Certificate", "Disability Certificate", "Experience Certificate", "Education Certificate"] },
];

const generateCode = (label) =>
  label.toUpperCase().replace(/[^A-Z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");

async function seedMasters() {
  try {
    const dbURI = process.env.DATABASE;
    if (!dbURI) throw new Error("DATABASE env var not set");

    console.log("Connecting to DB...");
    await mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("✅ DB connected");

    try {
      await MasterData.collection.dropIndexes();
      await MasterData.syncIndexes();
    } catch (e) {
      console.log("Index sync:", e.message);
    }

    let created = 0, skipped = 0;

    for (const { category, data } of masterSeedData) {
      console.log(`\n[${category}]`);
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        const label    = typeof item === "string" ? item : item.label;
        const code     = typeof item === "string" ? generateCode(label) : (item.code || generateCode(label));
        const metadata = typeof item === "string" ? {} : (item.metadata || {});

        const exists = await MasterData.findOne({ category, code });
        if (!exists) {
          await MasterData.create({ category, code, label, order: i, isActive: true, metadata });
          console.log(`  + ${label} [${code}]`);
          created++;
        } else {
          console.log(`  - skip: ${label}`);
          skipped++;
        }
      }
    }

    console.log(`\n✅ Done — created: ${created}, skipped: ${skipped}`);
  } catch (err) {
    console.error("❌ Seed error:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seedMasters();
