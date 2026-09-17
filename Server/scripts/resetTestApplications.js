/**
 * Clear pre-launch test applications so numbering can start clean under the
 * per-advertisement reference format (APP-<year>-<advtSeq>-<serial>).
 *
 * Deletes applications and their fee payments, and removes the application
 * reference counters so every advertisement restarts at 000001. Candidates
 * (OTR registrations) and advertisements are NOT touched — they are separate
 * records and deleting them is a different decision.
 *
 * Writes a JSON backup of everything it removes before removing it. This is
 * irreversible otherwise: once a real candidate holds a printed reference
 * number, renumbering stops being an option.
 *
 *   node scripts/resetTestApplications.js                    # dry run
 *   node scripts/resetTestApplications.js --apply
 *   node scripts/resetTestApplications.js --apply --advt=ADV/2026/0014
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const APPLY = process.argv.includes("--apply");
const ADVT = process.argv.find((a) => a.startsWith("--advt="))?.split("=")[1];

async function run() {
  // autoIndex off: this script must not build schema indexes as a side effect.
  await mongoose.connect(process.env.DATABASE, { autoIndex: false });
  const db = mongoose.connection.db;
  console.log(`Connected to ${db.databaseName}`);
  console.log(APPLY ? "MODE: APPLY — data will be deleted\n" : "MODE: DRY RUN — nothing will be changed\n");

  const appFilter = ADVT ? { advt_no: ADVT } : {};
  const applications = await db.collection("applications").find(appFilter).toArray();
  const refs = applications.map((a) => a.application_ref_no).filter(Boolean);
  const fees = await db
    .collection("feepayments")
    .find(refs.length ? { application_ref_no: { $in: refs } } : {})
    .toArray();

  // Per-advertisement counters plus the legacy year-scoped one.
  const counters = await db
    .collection("counters")
    .find({ key: /^application_ref_no:/ })
    .toArray();

  console.log(`Applications to delete : ${applications.length}${ADVT ? ` (advt ${ADVT})` : " (all)"}`);
  for (const a of applications) {
    console.log(`  ${String(a.application_ref_no).padEnd(24)} ${a.advt_no}  ${a.status}`);
  }
  console.log(`\nFee payments to delete : ${fees.length}`);
  for (const f of fees) {
    console.log(`  ${f.payment_id}  ${f.application_ref_no}  ${f.status}  ${f.amount}`);
  }
  console.log(`\nCounters to reset      : ${counters.length}`);
  for (const c of counters) console.log(`  ${c.key.padEnd(40)} seq=${c.seq}`);

  const docsWithFiles = applications.filter((a) => a.documents?.length);
  if (docsWithFiles.length) {
    const n = docsWithFiles.reduce((s, a) => s + a.documents.length, 0);
    console.log(
      `\nNOTE: ${n} uploaded document(s) across ${docsWithFiles.length} application(s) stay in S3.`,
    );
    console.log("      Deleting these rows orphans those objects; clean them up separately.");
  }

  console.log("\nNOT touched: candidates, advertisements, call letters, roll numbers.");

  if (!APPLY) {
    console.log("\nDry run only. Re-run with --apply to delete.");
    await mongoose.disconnect();
    return;
  }

  // Backup before destroying. Written next to the script's own directory so it
  // survives outside the database.
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.resolve(__dirname, `../log/test-data-backup-${stamp}.json`);
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.writeFileSync(
    backupPath,
    JSON.stringify({ takenAt: new Date(), applications, fees, counters }, null, 2),
  );
  console.log(`\nBackup written: ${backupPath}`);

  const delApps = await db.collection("applications").deleteMany(appFilter);
  const delFees = refs.length
    ? await db.collection("feepayments").deleteMany({ application_ref_no: { $in: refs } })
    : { deletedCount: 0 };
  const delCounters = await db
    .collection("counters")
    .deleteMany({ key: /^application_ref_no:/ });

  console.log(
    `\nDeleted ${delApps.deletedCount} application(s), ${delFees.deletedCount} fee payment(s), ${delCounters.deletedCount} counter(s).`,
  );
  console.log("Next application on each advertisement will be APP-<year>-<advtSeq>-000001.");

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
