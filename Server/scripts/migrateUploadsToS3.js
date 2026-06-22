/**
 * Migrate local uploads/ files to S3 and update DB paths.
 * Usage: node scripts/migrateUploadsToS3.js
 */
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { uploadBuffer, normalizeKey, isS3Enabled } from "../services/storage.service.js";
import Candidate from "../models/Candidate.js";
import Application from "../models/Application.js";
import Advertisement from "../models/Advertisement.js";
import Notice from "../models/Notice.js";

dotenv.config();

const UPLOADS_ROOT = path.resolve("uploads");

const walk = async (dir, files = []) => {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, files);
    else files.push(full);
  }
  return files;
};

const migrate = async () => {
  if (!isS3Enabled()) {
    console.error("S3 not configured. Set S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY.");
    process.exit(1);
  }

  await mongoose.connect(process.env.DATABASE);
  const files = await walk(UPLOADS_ROOT);
  console.log(`Found ${files.length} files to migrate`);

  for (const filePath of files) {
    const rel = path.relative(UPLOADS_ROOT, filePath).replace(/\\/g, "/");
    const module = rel.split("/")[0];
    const filename = path.basename(filePath);
    const buffer = await fs.promises.readFile(filePath);
    await uploadBuffer({ module, buffer, filename, contentType: "application/octet-stream" });
    console.log(`Uploaded: ${rel}`);
  }

  const updatePaths = async (Model, fields) => {
    const docs = await Model.find();
    for (const doc of docs) {
      let changed = false;
      for (const field of fields) {
        if (doc[field]) {
          doc[field] = normalizeKey(doc[field]);
          changed = true;
        }
      }
      if (changed) await doc.save();
    }
  };

  await updatePaths(Candidate, ["photo_path", "signature_path", "caste_cert_path", "udid_cert_path"]);
  for (const app of await Application.find()) {
    let changed = false;
    for (const d of app.documents || []) {
      if (d.file_path) { d.file_path = normalizeKey(d.file_path); changed = true; }
    }
    if (changed) await app.save();
  }
  await updatePaths(Advertisement, ["pdf_path"]);
  await updatePaths(Notice, ["pdf_path"]);

  console.log("Migration complete");
  await mongoose.disconnect();
};

migrate().catch((e) => { console.error(e); process.exit(1); });
