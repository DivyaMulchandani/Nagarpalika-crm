/**
 * Axis Bank EasyPay 2.0 — URL-redirection (site-to-site) integration.
 *
 * Protocol, as verified against the worked examples in the integration doc:
 *   • Payload  : "K=V&K=V&…" then AES-128-ECB / PKCS#7, base64, sent as form
 *                field `i` via POST.
 *   • Checksum : SHA-256 over a plain concatenation with NO separators.
 *                  payment  → CID + RID + CRN + AMT + key
 *                  enquiry  → CID + RID + CRN + key        (no AMT)
 *                The two formulas differ — do not unify them.
 *   • Response : same encryption, arriving URL-encoded in `i`.
 *
 * The bank redirects the user's browser to the return URL, so that request is
 * cross-site and carries no session cookie. The checksum below is the *only*
 * thing establishing that a payment result is genuine — never trust `i` without
 * verifying it, and never take the amount from anywhere but our own database.
 */
import crypto from "crypto";

const cfg = () => ({
  ver: process.env.EASYPAY_VER || "1.0",
  cid: process.env.EASYPAY_CID,
  typ: process.env.EASYPAY_TYP || "TEST",
  cny: process.env.EASYPAY_CNY || "INR",
  ppi: process.env.EASYPAY_PPI,
  cksKey: process.env.EASYPAY_CHECKSUM_KEY,
  encKey: process.env.EASYPAY_ENC_KEY,
  paymentUrl: process.env.EASYPAY_PAYMENT_URL,
  enquiryUrl: process.env.EASYPAY_ENQUIRY_URL,
  returnUrl: process.env.EASYPAY_RETURN_URL,
});

/** Throws with a precise message naming whichever key is missing. */
const requireConfig = (...needed) => {
  const c = cfg();
  const names = {
    cid: "EASYPAY_CID",
    ppi: "EASYPAY_PPI",
    cksKey: "EASYPAY_CHECKSUM_KEY",
    encKey: "EASYPAY_ENC_KEY",
    paymentUrl: "EASYPAY_PAYMENT_URL",
    enquiryUrl: "EASYPAY_ENQUIRY_URL",
    returnUrl: "EASYPAY_RETURN_URL",
  };
  const missing = needed.filter((k) => !c[k]).map((k) => names[k]);
  if (missing.length)
    throw new Error(`EasyPay is not configured — missing: ${missing.join(", ")}`);
  if (Buffer.byteLength(c.encKey) !== 16)
    throw new Error(
      `EASYPAY_ENC_KEY must be exactly 16 bytes for AES-128 (got ${Buffer.byteLength(c.encKey)})`,
    );
  return c;
};

export const isConfigured = () => {
  try {
    requireConfig("cid", "ppi", "cksKey", "encKey", "paymentUrl", "returnUrl");
    return true;
  } catch {
    return false;
  }
};

// ── Crypto primitives ────────────────────────────────────────────────────────

export const encrypt = (plain) => {
  const { encKey } = requireConfig("encKey");
  const c = crypto.createCipheriv("aes-128-ecb", Buffer.from(encKey), null);
  return Buffer.concat([c.update(String(plain), "utf8"), c.final()]).toString("base64");
};

export const decrypt = (b64) => {
  const { encKey } = requireConfig("encKey");
  const d = crypto.createDecipheriv("aes-128-ecb", Buffer.from(encKey), null);
  return Buffer.concat([
    d.update(Buffer.from(String(b64), "base64")),
    d.final(),
  ]).toString("utf8");
};

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");

/** SHA-256 over CID+RID+CRN+AMT+key. AMT must be the exact string transmitted. */
export const paymentChecksum = ({ cid, rid, crn, amt, key }) =>
  sha256(`${cid}${rid}${crn}${amt}${key}`);

/** SHA-256 over CID+RID+CRN+key — the enquiry variant carries no amount. */
export const enquiryChecksum = ({ cid, rid, crn, key }) =>
  sha256(`${cid}${rid}${crn}${key}`);

/** Constant-time hex compare, so a wrong checksum can't be found byte-by-byte. */
const checksumMatches = (a, b) => {
  const ba = Buffer.from(String(a || ""), "utf8");
  const bb = Buffer.from(String(b || ""), "utf8");
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
};

// ── Payload encoding ─────────────────────────────────────────────────────────

// Values sit in an unescaped "K=V&K=V" string, so a stray & or = in free text
// would silently split into bogus fields.
const clean = (v) => String(v ?? "").replace(/[&=]/g, " ").trim();

const toQuery = (obj) =>
  Object.entries(obj)
    .map(([k, v]) => `${k}=${v ?? ""}`)
    .join("&");

/** Parse "K=V&K=V" splitting each pair at its FIRST "=" only. */
export const parsePayload = (plain) =>
  Object.fromEntries(
    String(plain)
      .split("&")
      .filter(Boolean)
      .map((pair) => {
        const i = pair.indexOf("=");
        return i === -1 ? [pair, ""] : [pair.slice(0, i), pair.slice(i + 1)];
      }),
  );

/** AMT is Numeric(10,2); the checksum must use this exact rendering. */
export const formatAmount = (rupees) => Number(rupees).toFixed(2);

/**
 * Build the PPI (pre-populated payment info) string.
 * Axis defines the field layout per corporate; EASYPAY_PPI is that template and
 * every {amount} placeholder is replaced with the transaction amount. Error 427
 * ("Amount Mismatch") means this string disagrees with AMT.
 */
export const buildPpi = (amt) => {
  const { ppi } = requireConfig("ppi");
  return ppi.includes("{amount}") ? ppi.replaceAll("{amount}", amt) : ppi;
};

// ── Payment ──────────────────────────────────────────────────────────────────

/**
 * Build an encrypted payment request.
 * @returns {{url: string, i: string, fields: object}} POST `i` to `url` as a form.
 */
export const buildPaymentRequest = ({ rid, crn, amount, returnUrl, extra = {} }) => {
  const c = requireConfig("cid", "ppi", "cksKey", "encKey", "paymentUrl", "returnUrl");
  const amt = formatAmount(amount);

  const fields = {
    CID: c.cid,
    RID: rid,
    CRN: crn,
    AMT: amt,
    VER: c.ver,
    TYP: c.typ,
    CNY: c.cny,
    RTU: returnUrl || c.returnUrl,
    PPI: buildPpi(amt),
    RE1: "MN",
    RE2: clean(extra.RE2),
    RE3: clean(extra.RE3),
    RE4: clean(extra.RE4),
    RE5: clean(extra.RE5),
    CKS: paymentChecksum({ cid: c.cid, rid, crn, amt, key: c.cksKey }),
  };

  return { url: c.paymentUrl, i: encrypt(toQuery(fields)), fields };
};

// ── Response handling ────────────────────────────────────────────────────────

export const STATUS = { "000": "paid", "101": "pending", "111": "failed" };

export const ERROR_CODES = {
  421: "Unauthorised access — the server's public IP and domain must be whitelisted by Axis",
  422: "Corporate match not found — public IP and domain must be whitelisted by Axis",
  "423a": "The 'i' parameter is missing from the request",
  "423b": "Required parameters are missing, or the payload encryption is wrong",
  424: "Customer Reference Number (CRN) already used — it must be unique per transaction",
  "424a": "Reference ID (RID) already used — it must be unique per transaction",
  425: "Checksum error — the checksum could not be decoded or does not match",
  426: "The request could not be decoded — check the encryption key and payload",
  427: "Amount mismatch — the PPI total does not equal AMT",
  500: "Invalid request — contact the Axis CMS EasyPay team",
};

export const describeError = (code) =>
  ERROR_CODES[String(code)] || `Gateway error ${code}`;

/**
 * Decrypt and authenticate a gateway response.
 *
 * `variant` picks the checksum formula: "payment" includes AMT, "enquiry"
 * doesn't. Returns { ok:false } for anything that fails to decrypt or whose
 * checksum doesn't verify — callers must treat that as "not paid".
 */
export const parseGatewayResponse = (i, variant = "payment") => {
  const c = requireConfig("cid", "cksKey", "encKey");

  // Express has already decoded the query param; decode again only if the value
  // still looks percent-encoded (base64 itself never contains '%').
  const decoded = String(i).includes("%")
    ? decodeURIComponent(String(i))
    : String(i);

  const candidates = [decoded];
  // Base64 contains '+', and '+' in a query string form-decodes to a SPACE. If
  // the gateway didn't percent-encode it, every space here is really a '+'.
  // A payload this size almost always contains one, so try that reading too.
  if (decoded.includes(" ")) candidates.push(decoded.replace(/ /g, "+"));

  const expectedFor = (data) =>
    variant === "enquiry"
      ? enquiryChecksum({ cid: data.CID, rid: data.RID, crn: data.CRN, key: c.cksKey })
      : paymentChecksum({
          cid: data.CID,
          rid: data.RID,
          crn: data.CRN,
          // Verbatim: the bank hashes the string it sent ("2.00" ≠ "2").
          amt: data.AMT,
          key: c.cksKey,
        });

  // Take the first candidate whose CHECKSUM verifies, not merely the first that
  // decrypts. Base64 ignores stray characters, so a wrong reading can decrypt
  // to garbage instead of throwing — stopping there would reject a real
  // payment. Only a verified checksum proves we read the payload correctly.
  let lastError;
  let lastData;
  for (const candidate of candidates) {
    let plain;
    try {
      plain = decrypt(candidate);
    } catch (err) {
      lastError = `Could not decrypt gateway response: ${err.message}`;
      continue;
    }

    const data = parsePayload(plain);
    if (!data.CKS) {
      lastError = "Gateway response carried no checksum";
      lastData = data;
      continue;
    }
    if (!checksumMatches(expectedFor(data), data.CKS)) {
      lastError = "Gateway response failed checksum verification";
      lastData = data;
      continue;
    }

    // A valid checksum for someone else's corporate id is still not ours.
    if (String(data.CID) !== String(c.cid))
      return {
        ok: false,
        error: "Gateway response is for a different corporate id",
        data,
      };

    return { ok: true, data, status: STATUS[String(data.STC)] || "failed", plain };
  }

  return {
    ok: false,
    error: lastError || "Gateway response could not be authenticated",
    data: lastData,
  };
};

// ── Enquiry ──────────────────────────────────────────────────────────────────

/** Server-to-server status enquiry — the source of truth for reconciliation. */
export const enquire = async ({ rid, crn, brn }) => {
  const c = requireConfig("cid", "cksKey", "encKey", "enquiryUrl");

  const fields = {
    CID: c.cid,
    RID: rid,
    CRN: crn,
    VER: c.ver,
    TYP: c.typ,
    ...(brn ? { BRN: brn } : {}),
    CKS: enquiryChecksum({ cid: c.cid, rid, crn, key: c.cksKey }),
  };

  const res = await fetch(c.enquiryUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ i: encrypt(toQuery(fields)) }).toString(),
    signal: AbortSignal.timeout(20_000),
  });

  const text = (await res.text()).trim();
  if (!res.ok)
    return { ok: false, error: `Enquiry failed: HTTP ${res.status} ${res.statusText}`, raw: text };

  // The gateway may answer with a bare base64 blob, a form body, or JSON.
  let payload = text;
  if (text.includes("i=")) payload = new URLSearchParams(text).get("i") ?? text;
  else if (text.startsWith("{")) {
    try {
      payload = JSON.parse(text).i ?? text;
    } catch { /* keep raw */ }
  }
  // A short non-base64 body is an error code (see ERROR_CODES), not a payload.
  if (/^\d{3}[a-z]?$/i.test(payload))
    return { ok: false, error: describeError(payload), code: payload };

  return parseGatewayResponse(payload, "enquiry");
};
