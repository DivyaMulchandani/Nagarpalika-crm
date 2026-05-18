import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure we load the environment variables from the correct path
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import MasterData from "../models/MasterData.js";

const masterSeedData = [
  // Patient & Demographics Masters
  { category: "TITLE", data: ["Mr.", "Mrs.", "Ms.", "Dr.", "Baby", "Master"] },
  { category: "GENDER", data: ["Male", "Female", "Other"] },
  { category: "BLOOD_GROUP", data: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] },
  { category: "MARITAL_STATUS", data: ["Single", "Married", "Divorced", "Widowed"] },
  { category: "RELATIONSHIP_TYPE", data: ["Spouse", "Parent", "Child", "Sibling", "Guardian"] },
  { category: "ID_PROOF_TYPE", data: ["Aadhaar", "PAN", "Passport", "Driving License"] },
  { category: "OCCUPATION_TYPE", data: ["Salaried", "Business", "Student", "Homemaker", "Retired"] },
  { category: "REFERRAL_SOURCE", data: ["Walk-in", "Google", "Social Media", "Patient Referral", "Doctor Referral", "JustDial", "Practo"] },

  // Clinical Masters
  { category: "CHIEF_COMPLAINT", data: ["Pain", "Swelling", "Fever", "Bleeding", "Checkup", "Follow-up", "Referral"] },
  { category: "DIAGNOSIS", data: ["Caries", "Gingivitis", "Hypertension", "Diabetes"] },
  { category: "PROCEDURE", data: [
    { label: "Consultation", metadata: { defaultCost: 500 } },
    { label: "Extraction", metadata: { defaultCost: 1500 } },
    { label: "Filling", metadata: { defaultCost: 1000 } }
  ]},
  { category: "MEDICINE_FREQUENCY", data: ["OD", "BD", "TDS", "QID", "SOS"] },
  { category: "MEDICINE_DURATION_UNIT", data: ["Days", "Weeks", "Months"] },
  { category: "ALLERGY_TYPE", data: ["Drug", "Food", "Latex", "Environmental", "Other"] },
  { category: "VITAL_SIGN", data: ["BP", "Pulse", "Temperature", "SpO2", "Weight", "Height"] },
  { category: "CLINICAL_NOTE_TYPE", data: ["Examination Findings", "Investigation", "Advice", "Follow-up Plan"] },

  // Appointment Masters
  { category: "APPOINTMENT_TYPE", data: ["New Consultation", "Follow-up", "Procedure", "Emergency", "Checkup"] },
  { category: "APPOINTMENT_SOURCE", data: ["Walk-in", "Phone", "WhatsApp", "Website", "Doctor Scheduled"] },
  { category: "CANCELLATION_REASON", data: ["Patient Request", "Doctor Unavailable", "Emergency", "No Show"] },
  { category: "TIME_SLOT_DURATION", data: ["15 min", "20 min", "30 min", "45 min", "60 min"] },
  { category: "SPECIALIZATION", data: ["General Medicine", "General Surgery", "Pediatrics", "Cardiology", "Dermatology", "Orthopedics", "ENT", "Ophthalmology", "Gynecology", "Dentistry", "Psychiatry", "Neurology", "Radiology", "Pathology", "Anesthesiology"] },

  // Payment & Billing Masters
  { category: "PAYMENT_METHOD", data: ["Cash", "UPI", "Credit Card", "Debit Card", "Net Banking", "Insurance"] },
  { category: "DISCOUNT_TYPE", data: ["Percentage", "Fixed Amount"] },
  { category: "TAX_TYPE", data: ["CGST", "SGST", "IGST", "Exempt"] },
  { category: "TAX_RATE", data: [
    { label: "0%", metadata: { rate: 0 } },
    { label: "5%", metadata: { rate: 5 } },
    { label: "12%", metadata: { rate: 12 } },
    { label: "18%", metadata: { rate: 18 } }
  ]},

  // Clinic Configuration Masters
  { category: "CLINIC_TYPE", data: ["Dental", "Dermatology", "Orthopedic", "Multi-Specialty", "General Practice"] },
  { category: "WORKING_DAY", data: ["Monday-Saturday", "Monday-Friday", "Custom"] },
  { category: "HOLIDAY_TYPE", data: ["National Holiday", "Clinic Holiday", "Doctor Leave"] },
  { category: "FILE_UPLOAD_CATEGORY", data: ["X-Ray", "CT Scan", "MRI", "Blood Report", "Prescription", "Before Photo", "After Photo"] },

  // Specialty-Specific Masters
  { category: "TOOTH_NUMBER", data: ["11-18", "21-28", "31-38", "41-48", "51-55", "61-65", "71-75", "81-85"] },
  { category: "TOOTH_SURFACE", data: ["Mesial", "Distal", "Occlusal", "Buccal", "Lingual"] },
  { category: "TOOTH_CONDITION", data: ["Healthy", "Caries", "Missing", "Crown", "Implant"] }
];

const generateCode = (label) => {
  return label
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
};

async function seedMasters() {
  try {
    const dbURI = process.env.DATABASE;
    if (!dbURI) {
      throw new Error("DATABASE environment variable is not set. Please check your .env file.");
    }

    console.log("Connecting to database:", dbURI.replace(/:[^:]*@/, ":***@"));
    
    await mongoose.connect(dbURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Database connected successfully");

    // Clean up old indexes if schema changed
    try {
      await MasterData.collection.dropIndexes();
      await MasterData.syncIndexes();
    } catch (e) {
      console.log("No indexes to drop or index sync failed:", e.message);
    }

    let totalCreated = 0;
    let totalSkipped = 0;

    for (const group of masterSeedData) {
      const { category, data } = group;
      console.log(`\nProcessing category: ${category}`);

      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        
        let label, code, metadata = {};
        
        if (typeof item === 'string') {
          label = item;
          code = generateCode(label);
        } else {
          label = item.label;
          code = item.code || generateCode(label);
          metadata = item.metadata || {};
        }

        // Check if exists
        const existing = await MasterData.findOne({ category, code });

        if (!existing) {
          await MasterData.create({
            category,
            code,
            label,
            order: i,
            isActive: true,
            metadata
          });
          console.log(`  + Created: ${label} [${code}]`);
          totalCreated++;
        } else {
          console.log(`  - Skipped (exists): ${label} [${code}]`);
          totalSkipped++;
        }
      }
    }

    console.log(`\n🎉 Seeding complete!`);
    console.log(`Created: ${totalCreated}`);
    console.log(`Skipped: ${totalSkipped}`);

  } catch (error) {
    console.error("❌ Error seeding masters:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Database disconnected");
    process.exit(0);
  }
}

seedMasters();
