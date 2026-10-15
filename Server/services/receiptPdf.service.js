// Requires: bun add pdfkit  (same dependency as applicationPdf.service.js)
import PDFDocument from "pdfkit";

const esc = (v) => String(v ?? "—").slice(0, 500);

// Set MUNICIPALITY_NAME per deployment. Helvetica cannot render Gujarati, so
// this stays English — a Gujarati heading would come out as empty boxes until
// a Unicode font is embedded in the PDF pipeline.
const MUNICIPALITY =
  process.env.MUNICIPALITY_NAME || "Patan Nagarpalika Recruitment Portal";

// EasyPay reports the mode the payer actually used as a PMD code.
const PAYMENT_MODES = {
  AIB: "Online — Axis Bank Net Banking",
  OIB: "Online — Net Banking",
  CD: "Online — Debit / Credit Card",
  NR: "Online — NEFT / RTGS",
};

const describePaymentMode = (code) => PAYMENT_MODES[code] || "Online";

const row = (doc, label, value) => {
  doc.font("Helvetica-Bold").text(`${label}: `, { continued: true });
  doc.font("Helvetica").text(esc(value));
};

const sectionTitle = (doc, title) => {
  doc.moveDown(0.5);
  doc
    .fontSize(11)
    .font("Helvetica-Bold")
    .fillColor("#6d235f")
    .text(title.toUpperCase(), { underline: true });
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor("#000000");
};

const divider = (doc) => {
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#9b508d").stroke();
  doc.moveDown(0.5);
};

/**
 * Pipes a fee receipt PDF to `dest` (Express response stream).
 * @param {{ fee, candidate, advertisement }} data
 * @param {import("express").Response} dest
 */
export const generateReceiptPdf = (data, dest) =>
  new Promise((resolve, reject) => {
    const { fee, candidate, advertisement: advt } = data;

    const doc = new PDFDocument({ margin: 50, size: "A4" });
    doc.on("error", reject);
    dest.on("error", reject);
    doc.on("end", resolve);
    doc.pipe(dest);

    // ── Header ────────────────────────────────────────────────────────────────
    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .fillColor("#6d235f")
      .text("Fee Payment Receipt", { align: "center" });
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#4b5563")
      // Named per deployment: the same codebase serves more than one
      // municipality, and a generic header on a fee receipt is the kind of
      // detail a counter clerk is right to query.
      .text(MUNICIPALITY, { align: "center" });
    doc.moveDown(0.5);
    divider(doc);

    // ── Receipt details ───────────────────────────────────────────────────────
    sectionTitle(doc, "Receipt Details");
    row(doc, "Receipt No (Payment ID)", fee.payment_id);
    row(
      doc,
      "Transaction Date",
      fee.paid_at ? new Date(fee.paid_at).toLocaleString("en-IN") : null,
    );
    row(doc, "Gateway Transaction ID", fee.gateway_txn_id);
    row(doc, "Payment Status", fee.status);

    // ── Payment details ───────────────────────────────────────────────────────
    sectionTitle(doc, "Payment Details");
    row(
      doc,
      "Amount Paid",
      fee.amount != null ? `Rs. ${Number(fee.amount).toFixed(2)}` : null,
    );
    row(doc, "Payment Mode", describePaymentMode(fee.payment_mode_code));
    row(doc, "Application Ref No", fee.application_ref_no);
    row(doc, "Advertisement No", fee.advt_no);
    if (advt) {
      row(doc, "Post Title", advt.post_title?.en);
      // departmentName, not name — reading the wrong field is what made every
      // receipt print "Department: —" even when one was populated.
      row(doc, "Department", advt.department?.departmentName);
    }

    // ── Candidate details ─────────────────────────────────────────────────────
    sectionTitle(doc, "Candidate Details");
    if (candidate) {
      row(doc, "Registration ID", candidate.registration_id);
      row(doc, "Name", candidate.name);
      row(doc, "Mobile", candidate.mobile);
      row(doc, "Email", candidate.email);
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    doc.moveDown(1);
    divider(doc);
    doc
      .fontSize(8)
      .fillColor("#666666")
      .text(
        `Generated: ${new Date().toLocaleString("en-IN")} · System-generated document. No signature required.`,
        { align: "center" },
      );

    doc.end();
  });
