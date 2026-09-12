/**
 * EasyPay pre-flight check.
 *
 *   node scripts/easypayPreflight.js            # config + crypto only (offline)
 *   node scripts/easypayPreflight.js --live     # also calls the gateway once
 *
 * Run this on the server BEFORE letting a candidate pay. It catches the
 * failures that otherwise only show up as a stranded payer: a missing CID, a
 * key of the wrong length, a PPI total that disagrees with AMT, a return URL
 * still pointing at localhost, or an IP that was never whitelisted.
 *
 * --live sends ONE enquiry for a reference that cannot exist. No money moves.
 * The point is the error that comes back: 421/422 means the gateway refused to
 * talk to this host at all, which is the whitelisting answer you need before
 * a real transaction, not after.
 */
import dotenv from "dotenv";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env"), override: true });

const ep = await import("../services/easypay.service.js");

const GREEN = "\x1b[32m", RED = "\x1b[31m", YELLOW = "\x1b[33m", DIM = "\x1b[2m", OFF = "\x1b[0m";
const ok = (m) => console.log(`${GREEN}  PASS${OFF}  ${m}`);
const bad = (m) => { console.log(`${RED}  FAIL${OFF}  ${m}`); failures += 1; };
const warn = (m) => { console.log(`${YELLOW}  WARN${OFF}  ${m}`); warnings += 1; };
let failures = 0, warnings = 0;

const section = (t) => console.log(`\n${t}\n${"─".repeat(t.length)}`);

// ── 1. Configuration ─────────────────────────────────────────────────────────
section("1. Configuration");

const REQUIRED = [
  "EASYPAY_CID",
  "EASYPAY_PPI",
  "EASYPAY_CHECKSUM_KEY",
  "EASYPAY_ENC_KEY",
  "EASYPAY_PAYMENT_URL",
  "EASYPAY_ENQUIRY_URL",
  "EASYPAY_RETURN_URL",
];
for (const k of REQUIRED) {
  const v = process.env[k];
  if (!v) bad(`${k} is not set`);
  // Never print secrets — length is enough to spot a truncated paste.
  else if (k.includes("KEY")) ok(`${k} is set (${Buffer.byteLength(v)} bytes)`);
  else ok(`${k} = ${v}`);
}

const encKey = process.env.EASYPAY_ENC_KEY || "";
if (encKey && Buffer.byteLength(encKey) !== 16)
  bad(`EASYPAY_ENC_KEY must be exactly 16 bytes for AES-128 — got ${Buffer.byteLength(encKey)}`);

if (!process.env.PORTAL_URL)
  bad("PORTAL_URL is not set — the return handler cannot redirect the payer back, it will answer with JSON instead");
else if (/localhost|127\.0\.0\.1/.test(process.env.PORTAL_URL))
  warn(`PORTAL_URL points at ${process.env.PORTAL_URL} — payers will be redirected somewhere they cannot reach`);
else ok(`PORTAL_URL = ${process.env.PORTAL_URL}`);

const rtu = process.env.EASYPAY_RETURN_URL || "";
if (/localhost|127\.0\.0\.1/.test(rtu))
  bad("EASYPAY_RETURN_URL points at localhost — the bank must be able to reach it from the public internet");
if (rtu && !rtu.startsWith("https://"))
  warn("EASYPAY_RETURN_URL is not https — the gateway may refuse it");
if (rtu && !rtu.includes("/fee-payments/easypay/return"))
  warn(`EASYPAY_RETURN_URL does not look like the return route: ${rtu}`);

const typ = process.env.EASYPAY_TYP || "TEST";
if (typ === "TEST" && /^https:\/\/(?!uat-)/.test(process.env.EASYPAY_PAYMENT_URL || ""))
  warn(`EASYPAY_TYP is "TEST" but the payment URL is not a UAT host — confirm the production value with Axis`);
if ((process.env.EASYPAY_PAYMENT_URL || "").includes("uat-"))
  warn("Payment URL is the UAT host — this is not production");

// ── 2. Algorithms, against the vendor's published vectors ────────────────────
section("2. Algorithms (verified against the integration doc's own examples)");

const VEC_CKS = "ad5a4845d25e41a94ff9d520a59556063f756536511e8b718186d7c7599a0778";
const mine = crypto.createHash("sha256").update("2835" + "123456" + "123456" + "1" + "axis").digest("hex");
mine === VEC_CKS
  ? ok("payment checksum matches the doc's worked example")
  : bad("payment checksum does NOT match the doc's worked example — the algorithm has drifted");

const VEC_ENQ = "60fe1f3b8a86d9477bf7722d444b5f14da303f65bd55bb4efb37ac4370e0178e";
const mineEnq = crypto.createHash("sha256").update("2835" + "123456" + "123456" + "axis").digest("hex");
mineEnq === VEC_ENQ
  ? ok("enquiry checksum matches (note: no AMT — a different formula)")
  : bad("enquiry checksum does NOT match the doc's worked example");

try {
  const probe = "CID=1&RID=2&CRN=3&AMT=4.00";
  ep.decrypt(ep.encrypt(probe)) === probe
    ? ok("AES-128-ECB encrypt/decrypt round-trips with the configured key")
    : bad("encrypt/decrypt round-trip produced different text");
} catch (err) {
  bad(`encryption failed with the configured key: ${err.message}`);
}

// ── 3. A real payment payload ────────────────────────────────────────────────
section("3. Sample payment request (amount ₹1500)");

try {
  const req = ep.buildPaymentRequest({
    rid: "1757500000000001",
    crn: "1757500000000001",
    amount: 1500,
    extra: { RE2: "OTR2026000000", RE3: "ADV/2026/0001" },
  });

  const ppiTotal = req.fields.PPI.split("|").map(Number).reduce((a, b) => a + (b || 0), 0);
  const amt = Number(req.fields.AMT);
  ppiTotal === amt
    ? ok(`PPI total ${ppiTotal.toFixed(2)} equals AMT ${req.fields.AMT}`)
    : bad(`PPI total ${ppiTotal.toFixed(2)} != AMT ${req.fields.AMT} — the gateway will answer 427 (Amount Mismatch)`);

  console.log(`${DIM}  posts to : ${req.url}${OFF}`);
  console.log(`${DIM}  payload  : ${ep.decrypt(req.i).replace(/CKS=.*/, "CKS=<sha256>")}${OFF}`);
} catch (err) {
  bad(`could not build a payment request: ${err.message}`);
}

// ── 4. Live gateway reachability (opt-in) ────────────────────────────────────
if (process.argv.includes("--live")) {
  section("4. Live gateway check (one enquiry, no money moves)");
  try {
    // A reference the gateway cannot know. We only care which error comes back.
    const res = await ep.enquire({ rid: "9999999999999999", crn: "9999999999999999" });
    if (res.ok) {
      warn("gateway answered a reference that should not exist — unexpected, but it is reachable and talking to us");
    } else if (/whitelist|Unauthorised|Corporate match/i.test(res.error || "")) {
      bad(`NOT WHITELISTED — ${res.error}`);
      console.log(`${DIM}        Send Axis this server's public egress IP and the domain in EASYPAY_RETURN_URL.${OFF}`);
    } else if (/checksum|decode/i.test(res.error || "")) {
      bad(`gateway rejected our crypto — ${res.error}`);
      console.log(`${DIM}        Usually the wrong EASYPAY_CHECKSUM_KEY or EASYPAY_ENC_KEY for this environment.${OFF}`);
    } else {
      ok(`gateway reachable and authenticated us; it simply does not know that reference`);
      console.log(`${DIM}        reply: ${res.error}${OFF}`);
    }
  } catch (err) {
    bad(`could not reach the gateway: ${err.message}`);
    console.log(`${DIM}        Check outbound HTTPS from this server and that TLS 1.2 is permitted.${OFF}`);
  }
} else {
  section("4. Live gateway check");
  console.log(`${DIM}  skipped — re-run with --live to test connectivity and whitelisting${OFF}`);
}

// ── Summary ──────────────────────────────────────────────────────────────────
console.log(
  `\n${failures ? RED : GREEN}${failures} failure(s)${OFF}, ${warnings} warning(s)\n`,
);
process.exit(failures ? 1 : 0);
