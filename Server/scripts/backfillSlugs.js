import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

import Advertisement from "../models/Advertisement.js";

const toSlug = (str) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s]+/g, "-")
    .replace(/-+/g, "-");

async function run() {
  await mongoose.connect(process.env.DATABASE);
  console.log("Connected to MongoDB");

  const ads = await Advertisement.find({ slug: { $exists: false } });
  console.log(`Found ${ads.length} advertisement(s) without slug`);

  for (const ad of ads) {
    const base = toSlug(ad.post_title?.en || "advertisement");
    const seq = ad.advt_no
      ? ad.advt_no.replace(/\//g, "-").toLowerCase()
      : String(ad._id);
    ad.slug = `${base}-${seq}`;
    await ad.save();
    console.log(`  ${ad.advt_no} → /apply/${ad.slug}`);
  }

  console.log("Done.");
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
