/**
 * Drop indexes left behind by the multi-tenant HMS schema this project was
 * forked from.
 *
 * Mongoose creates indexes but never drops ones that disappear from a schema,
 * and this database was carried over from the old codebase rather than being
 * recreated — so the entire old index set survived the snake_case rewrite.
 *
 * The one that matters is feepayments.paymentId_1_tenantId_1: unique, NOT
 * sparse, on two fields no document has any more. Every fee payment therefore
 * indexes as (null, null), so the collection can hold exactly one row and every
 * subsequent payment fails with E11000. Dropping it unblocks payments.
 *
 * Safety: dry-run by default, an explicit allow-list (never "everything that
 * looks unused"), a deny-list for indexes that only LOOK stale, and a refusal
 * to drop any index whose fields are still present on even one document.
 *
 *   node scripts/dropStaleIndexes.js                 # dry run, shows the plan
 *   node scripts/dropStaleIndexes.js --critical      # dry run, blocker only
 *   node scripts/dropStaleIndexes.js --critical --apply
 *   node scripts/dropStaleIndexes.js --apply         # the rest
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
const CRITICAL_ONLY = process.argv.includes("--critical");

/**
 * The blocker, kept separate so it can go first and be verified on its own.
 * Until this is gone, no second fee payment can be written at all.
 */
const CRITICAL = [
  ["feepayments", "paymentId_1_tenantId_1"],
];

/**
 * Everything else confirmed stale, by collection. Each is an index whose key
 * fields are absent from the current Mongoose schema AND from every document.
 * Both conditions are re-checked at runtime — this list only limits what the
 * script is willing to consider.
 */
const STALE = [
  ["advertisements", "tenantId_1"],

  ["applications", "registrationId_1"],
  ["applications", "advtNo_1"],
  ["applications", "tenantId_1"],

  // Two of these are unique and non-sparse. The collection is empty today, so
  // they have not bitten yet, but they would cap it at a single call letter.
  ["callletters", "registrationId_1"],
  ["callletters", "advtNo_1"],
  ["callletters", "tenantId_1"],
  ["callletters", "registrationId_1_advtNo_1_tenantId_1"],
  ["callletters", "candidate_1_advertisement_1"],

  ["candidates", "tenantId_1"],
  // NOT listed: candidates.mobile_1_tenantId_1. Its leading field `mobile` is
  // live, so it still serves mobile lookups — redundant against mobile_1
  // rather than dead, which is a separate judgement call.

  ["feepayments", "applicationRefNo_1"],
  ["feepayments", "tenantId_1"],
  ["feepayments", "registrationId_1"],
  ["feepayments", "advtNo_1"],
  ["feepayments", "registrationId_1_tenantId_1"],

  ["helpqueries", "tenantId_1"],
  // Leading field is dead, so the whole index is unusable even though status
  // and createdAt are live — an index can only be entered from its prefix.
  ["helpqueries", "tenantId_1_status_1_createdAt_-1"],

  // Both are listed, but three notices written before the May 2026 cutover
  // still carry tenantId:"patan", so the in-use guard will refuse them until
  // that stray field is cleaned off those documents. That is deliberate.
  ["notices", "tenantId_1"],
  ["notices", "tenantId_1_status_1_publishedAt_-1"],

  // The Otp model keys on email, not phone.
  ["otps", "phone_1"],

  ["whatsappconfigs", "organizationId_1"],

  // recipientId / triggerType were renamed to recipient / trigger, so these two
  // are unusable despite their trailing createdAt being live.
  ["whatsappmessages", "recipientId_1_createdAt_-1"],
  ["whatsappmessages", "deliveryStatus_1"],
  ["whatsappmessages", "triggerType_1_createdAt_-1"],
  ["whatsappmessages", "metaMessageId_1"],
];

/**
 * Indexes that look stale to a naive check but are live. Belt and braces: the
 * allow-list already excludes them, and this makes removing them deliberate.
 */
const NEVER_DROP = new Set([
  // connect-mongo owns this collection and this is its TTL index — dropping it
  // would stop sessions ever expiring. It has no Mongoose model, which is
  // exactly why a schema-based check mistakes it for an orphan.
  "sessions.expires_1",
  // Legitimate: schema.paths does not expose paths inside a DocumentArray, so
  // a naive schema lookup cannot see "easypay_refs.rid".
  "feepayments.easypay_refs.rid_1",
  // Legitimate and sparse; the field simply has no data yet.
  "feepayments.gateway_txn_id_1",
]);

/** Schema paths, treating a.b as covered when the DocumentArray `a` exists. */
const schemaCovers = (paths, field) =>
  paths.has(field) || (field.includes(".") && paths.has(field.split(".")[0]));

async function run() {
  // autoIndex off: connecting with the models registered would otherwise BUILD
  // this schema's indexes as a side effect of a script whose job is dropping.
  await mongoose.connect(process.env.DATABASE, { autoIndex: false });
  const db = mongoose.connection.db;
  console.log(`Connected to ${db.databaseName}`);
  console.log(APPLY ? "MODE: APPLY — indexes will be dropped\n" : "MODE: DRY RUN — nothing will be changed\n");

  // Load every model so index keys can be checked against real schema paths.
  for (const f of fs.readdirSync(path.resolve(__dirname, "../models")).filter((f) => f.endsWith(".js"))) {
    await import(`../models/${f}`);
  }
  const pathsByCollection = {};
  for (const name of mongoose.modelNames()) {
    const M = mongoose.model(name);
    pathsByCollection[M.collection.collectionName] = new Set(Object.keys(M.schema.paths));
  }

  const targets = CRITICAL_ONLY ? CRITICAL : [...CRITICAL, ...STALE];
  const planned = [];
  const skipped = [];

  for (const [collName, indexName] of targets) {
    const label = `${collName}.${indexName}`;
    const note = (reason) => skipped.push({ label, reason });

    if (NEVER_DROP.has(label)) {
      note("on the never-drop list");
      continue;
    }

    const col = db.collection(collName);
    const indexes = await col.indexes().catch(() => null);
    if (!indexes) {
      note("collection does not exist");
      continue;
    }

    const ix = indexes.find((i) => i.name === indexName);
    if (!ix) {
      note("already gone");
      continue;
    }

    const schemaPaths = pathsByCollection[collName];
    if (!schemaPaths) {
      note("no Mongoose model owns this collection — not touching it");
      continue;
    }

    const keyFields = Object.keys(ix.key);
    const deadFields = keyFields.filter((k) => !schemaCovers(schemaPaths, k));

    // Guard 1: the LEADING field must be one of the dead ones. MongoDB can only
    // enter an index at its leftmost prefix, so a dead leading field makes the
    // whole index unusable however live the later ones are — and conversely a
    // live leading field still serves prefix queries, which makes the index
    // redundant rather than dead. Not this script's call to make.
    if (!deadFields.length) {
      note("every key field is still in the schema");
      continue;
    }
    if (deadFields[0] !== keyFields[0]) {
      note(`leading field "${keyFields[0]}" is live — redundant, not dead`);
      continue;
    }

    // Guard 2: no document may still carry a dead field. If one does, this is
    // leftover data the index still describes — stop and let a human decide,
    // rather than dropping an index over data that is actually there.
    const inUse = [];
    for (const field of deadFields) {
      const n = await col.countDocuments({ [field]: { $exists: true } }, { limit: 1 });
      if (n > 0) inUse.push(field);
    }
    if (inUse.length) {
      note(`STILL IN USE — documents carry: ${inUse.join(", ")}`);
      continue;
    }

    planned.push({
      label,
      collName,
      indexName,
      key: JSON.stringify(ix.key),
      unique: !!ix.unique,
      sparse: !!ix.sparse,
      docs: await col.estimatedDocumentCount(),
    });
  }

  console.log(`PLAN — ${planned.length} index(es) to drop`);
  console.log("=".repeat(94));
  for (const p of planned) {
    const risk = p.unique && !p.sparse ? "  <-- UNIQUE, NON-SPARSE: this one blocks inserts" : "";
    console.log(`  ${p.label.padEnd(46)} ${p.key.padEnd(34)}${risk}`);
  }
  if (!planned.length) console.log("  (nothing to do)");

  if (skipped.length) {
    console.log(`\nSKIPPED — ${skipped.length}`);
    console.log("=".repeat(94));
    for (const s of skipped) console.log(`  ${s.label.padEnd(46)} ${s.reason}`);
  }

  if (!APPLY) {
    console.log(
      `\nDry run only. Re-run with --apply to drop the ${planned.length} index(es) above.`,
    );
    await mongoose.disconnect();
    return;
  }

  console.log("\nDROPPING");
  console.log("=".repeat(94));
  let dropped = 0;
  for (const p of planned) {
    try {
      await db.collection(p.collName).dropIndex(p.indexName);
      dropped += 1;
      console.log(`  dropped  ${p.label}`);
    } catch (err) {
      // Keep going: one failure must not strand the rest, least of all the
      // blocker. Re-running is safe — a missing index is reported "already gone".
      console.error(`  FAILED   ${p.label} — ${err.message}`);
    }
  }
  console.log(`\nDropped ${dropped} of ${planned.length}.`);
  if (dropped < planned.length)
    console.log("Re-run to retry the failures; the script is idempotent.");

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
