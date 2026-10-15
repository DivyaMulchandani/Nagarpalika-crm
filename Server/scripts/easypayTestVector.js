/**
 * Produce the plain and encrypted strings the Axis UAT test-case sheet asks for,
 * and decode strings coming back the other way.
 *
 * The sheet wants a "Plain Text/Encrypted String" per test case, and Axis asks
 * for the plain and encrypted string alongside any error screenshot when
 * raising a query — this prints both in a form that can be pasted straight in.
 *
 * Read-only throughout: no document is written, no counter consumed, and
 * mongoose connects with autoIndex off so it cannot build indexes as a side
 * effect. --sample needs no database at all.
 *
 *   node scripts/easypayTestVector.js --sample
 *   node scripts/easypayTestVector.js --ref=APP-2026-0014-000001
 *   node scripts/easypayTestVector.js --payment-id=<uuid>
 *   node scripts/easypayTestVector.js --payment-id=<uuid> --enquiry
 *   node scripts/easypayTestVector.js --decode=<base64 string from the bank>
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import * as easypay from "../services/easypay.service.js";

const arg = (name) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
const flag = (name) => process.argv.includes(`--${name}`);

const rule = (title) => {
  console.log(`\n${"=".repeat(78)}\n${title}\n${"=".repeat(78)}`);
};

/** Pretty-print a payload one parameter per line — a single line is unreadable. */
const showPlain = (plain) => {
  console.log("\nPLAIN TEXT (single line, for the sheet):\n");
  console.log(plain);
  console.log("\nPLAIN TEXT (expanded, for reading):\n");
  for (const pair of plain.split("&")) console.log(`  ${pair}`);
};

const showEncrypted = (i) => {
  console.log("\nENCRYPTED STRING (the `i` form field):\n");
  console.log(i);
};

/** Reproduce the exact payload for a stored payment, or build a fresh one. */
async function paymentVector() {
  const paymentId = arg("payment-id");
  const ref = arg("ref");

  // ── Synthetic: no database, usable before any test data exists ────────────
  if (!paymentId && !ref) {
    const amount = Number(arg("amount") || 250);
    const stamp = `${String(Date.now()).slice(-10)}${String(Math.floor(Math.random() * 1e6)).padStart(6, "0")}`;
    return {
      label: "SAMPLE (synthetic data — no database lookup)",
      built: easypay.buildPaymentRequest({
        rid: stamp,
        crn: stamp,
        amount,
        ppi: {
          application_ref_no: "APP-2026-0014-000001",
          candidate_name: "Rameshbhai M. Patel",
          advt_no: "ADV/2026/0014",
          post_title: "Junior Clerk",
          registration_id: "OTR20260000123",
        },
        extra: { RE2: "OTR20260000123", RE3: "ADV/2026/0014" },
      }),
      meta: { amount },
    };
  }

  await mongoose.connect(process.env.DATABASE, { autoIndex: false });
  const [{ default: Application }, { default: Candidate }, { default: Advertisement },
         { default: FeePayment }, { resolveApplicationFee }] = await Promise.all([
    import("../models/Application.js"),
    import("../models/Candidate.js"),
    import("../models/Advertisement.js"),
    import("../models/FeePayment.js"),
    import("../services/feeCalculator.service.js"),
  ]);

  let fee = null;
  let applicationRef = ref;

  if (paymentId) {
    fee = await FeePayment.findOne({ payment_id: paymentId }).lean();
    if (!fee) throw new Error(`No payment found with payment_id ${paymentId}`);
    applicationRef = fee.application_ref_no;
  }

  const app = await Application.findOne({ application_ref_no: applicationRef }).lean();
  if (!app) throw new Error(`No application found with ref ${applicationRef}`);

  const [candidate, advt] = await Promise.all([
    Candidate.findOne({ registration_id: app.registration_id })
      .select("name category gender")
      .lean(),
    Advertisement.findOne({ advt_no: app.advt_no }).lean(),
  ]);

  // An existing payment reproduces byte-for-byte: RID, CRN and amount are all
  // stored, so the string below is the one that actually went to the gateway.
  // Without one we mint a throwaway reference — representative, not replayable.
  const amount = fee ? fee.amount : resolveApplicationFee(advt, candidate).amount;
  const stamp = `${String(Date.now()).slice(-10)}${String(Math.floor(Math.random() * 1e6)).padStart(6, "0")}`;
  const rid = fee?.easypay_rid || stamp;
  const crn = fee?.easypay_crn || stamp;

  return {
    label: fee
      ? `EXACT REPRODUCTION of payment ${fee.payment_id} (status: ${fee.status})`
      : `FRESH REQUEST for ${app.application_ref_no} (throwaway RID/CRN — not replayable)`,
    built: easypay.buildPaymentRequest({
      rid,
      crn,
      amount,
      ppi: {
        application_ref_no: app.application_ref_no,
        candidate_name: candidate?.name,
        advt_no: app.advt_no,
        post_title: advt?.post_title?.en,
        registration_id: app.registration_id,
      },
      extra: { RE2: app.registration_id, RE3: app.advt_no },
    }),
    meta: { amount, rid, crn, ref: app.application_ref_no },
  };
}

async function enquiryVector() {
  let rid = arg("rid");
  let crn = arg("crn");
  const paymentId = arg("payment-id");

  if (paymentId) {
    await mongoose.connect(process.env.DATABASE, { autoIndex: false });
    const { default: FeePayment } = await import("../models/FeePayment.js");
    const fee = await FeePayment.findOne({ payment_id: paymentId }).lean();
    if (!fee) throw new Error(`No payment found with payment_id ${paymentId}`);
    rid = rid || fee.easypay_rid;
    crn = crn || fee.easypay_crn;
    if (!rid) throw new Error("That payment has no EasyPay reference — it was never initiated");
  }
  if (!rid || !crn) throw new Error("--enquiry needs --payment-id, or both --rid and --crn");

  const cid = process.env.EASYPAY_CID;
  const fields = {
    CID: cid,
    RID: rid,
    CRN: crn,
    VER: process.env.EASYPAY_VER || "1.0",
    TYP: process.env.EASYPAY_TYP || "TEST",
    CKS: easypay.enquiryChecksum({
      cid,
      rid,
      crn,
      key: process.env.EASYPAY_CHECKSUM_KEY,
    }),
  };
  const plain = Object.entries(fields).map(([k, v]) => `${k}=${v}`).join("&");
  return { label: `ENQUIRY for RID ${rid}`, plain, i: easypay.encrypt(plain) };
}

async function run() {
  if (!easypay.isConfigured()) {
    console.error(
      "EasyPay is not configured in .env — set EASYPAY_CID, the keys and the URLs first.",
    );
    process.exit(1);
  }

  // ── Decode a string in either direction ──────────────────────────────────
  const toDecode = arg("decode");
  if (toDecode) {
    rule("DECODE");
    const variant = flag("enquiry") ? "enquiry" : "payment";
    const parsed = easypay.parseGatewayResponse(toDecode, variant);
    if (parsed.ok) {
      console.log(`\nChecksum: VERIFIED (${variant} formula)`);
      console.log(`Status  : ${parsed.status}  (STC=${parsed.data.STC})`);
      showPlain(parsed.plain);
    } else {
      // Still show whatever decrypted — an unverified payload is exactly what
      // Axis asks to see when raising a query.
      console.log(`\nChecksum: NOT VERIFIED — ${parsed.error}`);
      if (parsed.data) {
        console.log("\nDecrypted fields (treat as untrusted):\n");
        for (const [k, v] of Object.entries(parsed.data)) console.log(`  ${k}=${v}`);
      } else {
        try {
          showPlain(easypay.decrypt(toDecode));
        } catch (err) {
          console.log(`Could not decrypt at all: ${err.message}`);
        }
      }
    }
    return;
  }

  // ── Enquiry request vector ───────────────────────────────────────────────
  if (flag("enquiry")) {
    const { label, plain, i } = await enquiryVector();
    rule(label);
    showPlain(plain);
    showEncrypted(i);
    console.log(`\nPOST this as form field "i" to ${process.env.EASYPAY_ENQUIRY_URL}`);
    return;
  }

  // ── Payment request vector ───────────────────────────────────────────────
  const { label, built, meta } = await paymentVector();
  rule(label);

  // Decrypt our own output rather than printing the pre-encryption string:
  // this proves the bytes actually in `i` are what we think they are.
  const plain = easypay.decrypt(built.i);
  showPlain(plain);
  showEncrypted(built.i);

  const f = easypay.parsePayload(plain);
  const ppi = String(f.PPI).split("|");
  console.log("\nPPI FIELDS (as the candidate will see them):\n");
  const labels = [
    "Application Reference Number", "Candidate Name", "Advertisement Number",
    "Post Applied For", "Registration ID (OTR)", "Application Fee (INR)", "Amount",
  ];
  ppi.forEach((v, idx) => console.log(`  ${idx + 1}. ${(labels[idx] || "?").padEnd(30)} ${v}`));

  console.log("\nSELF-CHECKS:\n");
  const ok = (name, cond) => console.log(`  ${cond ? "OK  " : "FAIL"}  ${name}`);
  ok(`checksum verifies`,
    easypay.paymentChecksum({ cid: f.CID, rid: f.RID, crn: f.CRN, amt: f.AMT,
      key: process.env.EASYPAY_CHECKSUM_KEY }) === f.CKS);
  ok(`last PPI field equals AMT (${ppi[ppi.length - 1]} vs ${f.AMT})`,
    Number(ppi[ppi.length - 1]) === Number(f.AMT));
  ok(`PPI field count is ${ppi.length}`, ppi.length > 0);
  ok(`RID length ${String(f.RID).length} within 6-20`,
    String(f.RID).length >= 6 && String(f.RID).length <= 20);
  ok(`CRN length ${String(f.CRN).length} within 10-20`,
    String(f.CRN).length >= 10 && String(f.CRN).length <= 20);

  console.log(`\nPOST this as form field "i" to ${process.env.EASYPAY_PAYMENT_URL}`);
  if (meta?.ref) console.log(`Application: ${meta.ref}   Amount: ${meta.amount}`);
}

run()
  .catch((err) => {
    console.error(`\nError: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState) await mongoose.disconnect();
  });
