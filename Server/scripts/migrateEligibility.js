/**
 * Bring existing data in line with the eligibility rules (qualification type /
 * level, advertisement minimum education, document requirement modes).
 *
 *   node scripts/migrateEligibility.js           # report only — changes nothing
 *   node scripts/migrateEligibility.js --apply   # make the safe automatic fixes
 *
 * --apply only does what needs no judgement:
 *   1. Qualification entries with no type get one: certificate-like names
 *      (CCC, computer, typing, licence…) become "certificate", the rest "education".
 *   2. Advertisement document rows get `requirement` copied from is_compulsory.
 * Levels and each advertisement's minimum education / age relaxation are
 * decisions for the admin panel; the report lists what is still missing.
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const { default: Qualification } = await import("../models/Qualification.js");
const { default: Advertisement } = await import("../models/Advertisement.js");
const { default: Candidate } = await import("../models/Candidate.js");
const { default: Application } = await import("../models/Application.js");

const APPLY = process.argv.includes("--apply");
const CERT_LIKE = /\bCCC\b|computer|typing|shorthand|licen[cs]e|\bNCC\b|sports/i;
const line = (t = "") => console.log(t);

await mongoose.connect(process.env.DATABASE);
line(APPLY ? "=== APPLYING safe fixes ===" : "=== REPORT ONLY (run with --apply to make the safe fixes) ===");

// ── 1. Qualification master ──────────────────────────────────────────────────
line("\n1. Qualification master");
const quals = await Qualification.find().sort({ name: 1 }).lean();
let typeFixes = 0;
for (const q of quals) {
  const proposed = q.type || (CERT_LIKE.test(q.name) ? "certificate" : "education");
  const note = [];
  if (!q.type) note.push(`type not set -> ${proposed}`);
  if (proposed === "education" && typeof q.level !== "number" && !/^others$/i.test(q.name)) note.push("LEVEL MISSING (set in admin)");
  if (!q.isActive) note.push("inactive");
  line(`   ${q.name.padEnd(55)} ${String(q.type || "-").padEnd(12)} level ${q.level ?? "-"}  ${note.join("; ")}`);
  if (!q.type) {
    typeFixes++;
    if (APPLY) await Qualification.updateOne({ _id: q._id }, { $set: { type: proposed } });
  }
}
line(`   -> ${typeFixes} entr${typeFixes === 1 ? "y" : "ies"} without a type${APPLY ? " fixed" : " (would be fixed)"}`);
line("   Check the list: anything typed wrongly can be changed in Admin > Master > Qualification.");

// ── 2. Advertisements ────────────────────────────────────────────────────────
line("\n2. Advertisements");
const ads = await Advertisement.find().populate("min_education", "name level").sort({ createdAt: 1 }).lean();
for (const a of ads) {
  const missingReq = (a.required_qualifications || []).filter((rq) => !rq.requirement).length;
  const todo = [];
  if (!a.min_education) todo.push("set Minimum Education");
  else if (typeof a.min_education.level !== "number") todo.push(`level missing on "${a.min_education.name}"`);
  if (!a.age_limit?.min && !a.age_limit?.max) todo.push("no age limit");
  if (!a.age_relaxation?.enabled) todo.push("age relaxation off (confirm)");
  if (missingReq) todo.push(`${missingReq} document row(s) without requirement${APPLY ? " -> fixed" : " (would be fixed)"}`);
  line(`   ${String(a.advt_no).padEnd(16)} ${String(a.status).padEnd(10)} ends ${a.end_date ? new Date(a.end_date).toISOString().slice(0, 10) : "-"}  ${a.post_title?.en || ""}`);
  line(`      ${todo.length ? todo.join("; ") : "OK"}`);
  if (APPLY && missingReq) {
    const rows = a.required_qualifications.map((rq) => ({
      ...rq,
      requirement: rq.requirement || (rq.is_compulsory ? "compulsory" : "optional"),
    }));
    // Targeted update: no full-document validation of older advertisements.
    await Advertisement.updateOne({ _id: a._id }, { $set: { required_qualifications: rows } });
  }
}

// ── 3. Candidates ────────────────────────────────────────────────────────────
line("\n3. Candidates whose highest qualification can't be ranked");
const eduNames = new Set(
  (await Qualification.find({ type: { $in: ["education", null] } }).select("name").lean())
    .map((q) => q.name)
    .filter((n) => !/^others$/i.test(n)),
);
const cands = await Candidate.find().select("registration_id qualification qualification_equivalent").lean();
const unranked = cands.filter((c) => !eduNames.has(c.qualification) && !eduNames.has(c.qualification_equivalent));
unranked.forEach((c) => line(`   ${c.registration_id}  "${c.qualification || "(empty)"}"`));
line(`   -> ${unranked.length} of ${cands.length} candidate(s). They are blocked from posts with a minimum education until`);
line("      they pick a listed qualification (or an equivalent) in My Profile.");

// ── 4. Applications ──────────────────────────────────────────────────────────
const old = await Application.countDocuments({ "eligibility.cutoff_date": { $exists: false } });
const all = await Application.countDocuments();
line(`\n4. Applications: ${old} of ${all} were submitted before the eligibility check (no snapshot). Nothing to change.`);

await mongoose.disconnect();
line(APPLY ? "\nDone." : "\nNothing was changed.");
