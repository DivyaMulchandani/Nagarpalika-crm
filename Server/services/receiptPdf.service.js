import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import {
  UPSC_PAGE,
  drawUpscHeader,
  drawUpscCenteredSection,
  drawUpscFooter,
  ensureSpace,
  isEmpty,
  loadImageBuffer,
} from "./pdfLayout.service.js";

/**
 * Fee payment receipt / transaction slip.
 *
 * One layout for every outcome. Only a PAID payment is titled "Receipt";
 * anything else is a "Transaction Slip" with a coloured status band, a
 * diagonal watermark and an explicit note, so a failed or pending slip can
 * never be mistaken for proof that the fee was paid.
 */

const MUNICIPALITY_EN = (
  process.env.MUNICIPALITY_NAME || "Patan Nagarpalika"
).toUpperCase();

// EasyPay reports the mode the payer actually used as a PMD code.
const PAYMENT_MODES = {
  AIB: "Online — Axis Bank Net Banking",
  OIB: "Online — Net Banking",
  CD: "Online — Debit / Credit Card",
  NR: "Online — NEFT / RTGS",
};

const STATUS_STYLE = {
  paid: {
    title: "FEE PAYMENT RECEIPT",
    label: "PAYMENT SUCCESSFUL",
    color: "#15803d",
    bg: "#f0fdf4",
    note: "This is a computer-generated receipt and does not require a signature. Please keep it safely for future reference.",
  },
  failed: {
    title: "PAYMENT TRANSACTION SLIP",
    label: "PAYMENT FAILED",
    color: "#b91c1c",
    bg: "#fef2f2",
    watermark: "NOT PAID",
    note: "THIS IS NOT A RECEIPT. The fee has NOT been received for this transaction. If any amount was debited from your account, it will be refunded by your bank as per its rules.",
  },
  pending: {
    title: "PAYMENT TRANSACTION SLIP",
    label: "PAYMENT PENDING",
    color: "#b45309",
    bg: "#fffbeb",
    watermark: "PENDING",
    note: "THIS IS NOT A PROOF OF PAYMENT. The bank has not yet confirmed this payment. Its status will update automatically once confirmed — please do not pay again.",
  },
  refunded: {
    title: "PAYMENT TRANSACTION SLIP",
    label: "PAYMENT REFUNDED",
    color: "#475569",
    bg: "#f8fafc",
    watermark: "REFUNDED",
    note: "This payment has been refunded and is no longer valid towards the application fee.",
  },
};

const IST = { timeZone: "Asia/Kolkata" };

/** Dates in IST explicitly — the server's own clock is UTC. */
const fmtDateTime = (d) => {
  if (!d) return null;
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return String(d);
  return `${date.toLocaleString("en-IN", {
    ...IST,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })} IST`;
};

const fmtRs = (n) =>
  n === null || n === undefined || n === ""
    ? null
    : `Rs. ${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const loadLogo = async () => {
  const candidates = [
    path.resolve(process.cwd(), "assets/np-logo.png"),
    path.resolve(process.cwd(), "../Admin/src/assets/images/np-logo.png"),
    path.resolve(process.cwd(), "Admin/src/assets/images/np-logo.png"),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const buf = await loadImageBuffer(p);
        if (buf) return buf;
      }
    } catch {
      /* try the next location */
    }
  }
  return null;
};

// ── Drawing helpers ─────────────────────────────────────────────────────────

const LABEL_BG = "#faf4f9";

/** Faint diagonal word across the page body, drawn before the content. */
const drawWatermark = (doc, text, color) => {
  if (!text) return;
  const cx = doc.page.width / 2;
  const cy = doc.page.height / 2;
  // text() moves pdfkit's cursor, and save()/restore() only cover graphics
  // state — without putting the cursor back, everything after the watermark
  // would start halfway down the page.
  const { x: x0, y: y0 } = doc;
  doc.save();
  doc.rotate(-35, { origin: [cx, cy] });
  doc
    .font("Helvetica-Bold")
    .fontSize(96)
    .fillColor(color)
    .opacity(0.07)
    .text(text, 0, cy - 48, { width: doc.page.width, align: "center" });
  doc.restore();
  doc.opacity(1);
  doc.x = x0;
  doc.y = y0;
};

/** Coloured band: status on the left, amount on the right. */
const drawStatusBand = (doc, style, amountText, subText) => {
  const { left, width } = UPSC_PAGE;
  const h = 46;
  ensureSpace(doc, h + 10);
  const y = doc.y;

  doc.lineWidth(1).fillColor(style.bg).strokeColor(style.color);
  doc.rect(left, y, width, h).fillAndStroke();
  doc.rect(left, y, 5, h).fill(style.color);

  doc
    .font("Helvetica-Bold")
    .fontSize(14)
    .fillColor(style.color)
    .text(style.label, left + 16, y + 9, { width: width / 2 });
  if (subText)
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#4b5563")
      .text(subText, left + 16, y + 28, { width: width / 2 + 40 });

  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#4b5563")
    .text("AMOUNT", left + width / 2, y + 9, { width: width / 2 - 14, align: "right" });
  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor(style.color)
    .text(amountText, left + width / 2, y + 21, { width: width / 2 - 14, align: "right" });

  doc.fillColor(UPSC_PAGE.text);
  doc.y = y + h + 10;
};

/**
 * Four-column key/value grid: | label | value | label | value |.
 * Pairs with an empty value are dropped; an odd pair out spans the full row.
 */
const drawKvGrid = (doc, title, pairs) => {
  const rows = pairs.filter(([, v]) => !isEmpty(v));
  if (!rows.length) return;

  const { left, width, border } = UPSC_PAGE;
  const pad = 4;
  const size = 8.5;
  const half = width / 2;
  const labelW = 100;
  const valW = half - labelW;

  drawUpscCenteredSection(doc, title);

  const cellH = (label, value, vw) => {
    doc.font("Helvetica-Bold").fontSize(size);
    const lh = doc.heightOfString(String(label), { width: labelW - pad * 2 });
    doc.font("Helvetica").fontSize(size);
    const vh = doc.heightOfString(String(value), { width: vw - pad * 2 });
    return Math.max(lh, vh, size) + pad * 2;
  };

  const drawCell = (x, y, w, h, text, bold, bg) => {
    if (bg) doc.rect(x, y, w, h).fill(bg);
    doc.lineWidth(0.5).strokeColor(border).rect(x, y, w, h).stroke();
    doc
      .fillColor("#111827")
      .font(bold ? "Helvetica-Bold" : "Helvetica")
      .fontSize(size)
      .text(String(text), x + pad, y + pad, { width: w - pad * 2 });
  };

  // Group into lines: a row marked full (third element true) — e.g. a long
  // reference number that would otherwise wrap mid-value — gets a line to
  // itself; everything else pairs up two per line.
  const lines = [];
  for (let i = 0; i < rows.length; i++) {
    const a = rows[i];
    const b = rows[i + 1];
    if (a[2] || !b || b[2]) lines.push([a]);
    else {
      lines.push([a, b]);
      i++;
    }
  }

  for (const [a, b] of lines) {
    if (!b) {
      // Odd one out: let its value span the remaining width.
      const vw = width - labelW;
      const h = cellH(a[0], a[1], vw);
      ensureSpace(doc, h);
      const y = doc.y;
      drawCell(left, y, labelW, h, a[0], true, LABEL_BG);
      drawCell(left + labelW, y, vw, h, a[1], false);
      doc.y = y + h;
      continue;
    }

    const h = Math.max(cellH(a[0], a[1], valW), cellH(b[0], b[1], valW));
    ensureSpace(doc, h);
    const y = doc.y;
    drawCell(left, y, labelW, h, a[0], true, LABEL_BG);
    drawCell(left + labelW, y, valW, h, a[1], false);
    drawCell(left + half, y, labelW, h, b[0], true, LABEL_BG);
    drawCell(left + half + labelW, y, valW, h, b[1], false);
    doc.y = y + h;
  }
  doc.y += 8;
};

/** Itemised amount table with a header row and a bold total. */
const drawAmountTable = (doc, items, totalLabel, total, accent) => {
  const { left, width, border } = UPSC_PAGE;
  const pad = 5;
  const size = 9;
  const cols = [
    { title: "S. No.", w: 50, align: "center" },
    { title: "Description", w: width - 50 - 140, align: "left" },
    { title: "Amount", w: 140, align: "right" },
  ];

  drawUpscCenteredSection(doc, "Fee Details");

  const rowH = size + pad * 2 + 2;
  ensureSpace(doc, rowH * (items.length + 2));

  const drawRow = (cells, { bold = false, bg = null, color = "#111827" } = {}) => {
    const y = doc.y;
    let x = left;
    cells.forEach((text, i) => {
      const { w, align } = cols[i];
      if (bg) doc.rect(x, y, w, rowH).fill(bg);
      doc.lineWidth(0.5).strokeColor(border).rect(x, y, w, rowH).stroke();
      doc
        .fillColor(color)
        .font(bold ? "Helvetica-Bold" : "Helvetica")
        .fontSize(size)
        .text(String(text ?? ""), x + pad, y + pad + 1, { width: w - pad * 2, align });
      x += w;
    });
    doc.y = y + rowH;
  };

  drawRow(cols.map((c) => c.title), { bold: true, bg: "#f3e8f1" });
  items.forEach(([desc, amt], i) => drawRow([String(i + 1), desc, amt]));
  drawRow(["", totalLabel, total], { bold: true, bg: LABEL_BG, color: accent });
  doc.y += 8;
};

/** Boxed note in the status colour. */
const drawNote = (doc, text, style) => {
  const { left, width } = UPSC_PAGE;
  const pad = 8;
  doc.font("Helvetica").fontSize(8.5);
  const h = doc.heightOfString(text, { width: width - pad * 2 - 6 }) + pad * 2;
  ensureSpace(doc, h + 8);
  const y = doc.y;
  doc.lineWidth(0.8).fillColor(style.bg).strokeColor(style.color);
  doc.rect(left, y, width, h).fillAndStroke();
  doc.rect(left, y, 4, h).fill(style.color);
  doc
    .font(style.watermark ? "Helvetica-Bold" : "Helvetica")
    .fontSize(8.5)
    .fillColor(style.watermark ? style.color : "#374151")
    .text(text, left + pad + 6, y + pad, { width: width - pad * 2 - 6 });
  doc.fillColor(UPSC_PAGE.text);
  doc.y = y + h + 8;
};

// ── Document ────────────────────────────────────────────────────────────────

/**
 * Pipes a fee receipt / transaction slip PDF to `dest`.
 * @param {{ fee, candidate, advertisement }} data
 * @param {import("stream").Writable} dest  Express response or buffer sink
 */
export const generateReceiptPdf = (data, dest) =>
  new Promise((resolve, reject) => {
    const { fee, candidate, advertisement: advt } = data;
    const style = STATUS_STYLE[fee.status] || STATUS_STYLE.pending;
    // The bank's own answer for the attempt that decided this record.
    const g = fee.gateway_response || {};

    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 30, left: 36, right: 36, bottom: 36 },
      info: { Title: `${style.title} — ${fee.payment_id}` },
    });
    doc.on("error", reject);
    dest.on("error", reject);
    doc.on("end", resolve);
    doc.pipe(dest);

    (async () => {
      try {
        const logoBuffer = await loadLogo();

        drawWatermark(doc, style.watermark, style.color);

        drawUpscHeader(doc, {
          mainTitleEn: MUNICIPALITY_EN,
          subTitle: style.title,
          advtNo: fee.advt_no || advt?.advt_no,
          postTitle: advt?.post_title?.en,
          department: advt?.department?.departmentName,
          postClass: advt?.class,
          logoBuffer,
        });

        const when =
          fee.status === "paid"
            ? `Paid on ${fmtDateTime(fee.paid_at) || "—"}`
            : `Transaction on ${g.TET ? `${g.TET} IST` : fmtDateTime(fee.updatedAt) || "—"}`;
        drawStatusBand(doc, style, fmtRs(fee.amount) || "—", when);

        drawKvGrid(doc, "Transaction Details", [
          [fee.status === "paid" ? "Receipt No." : "Reference No.", fee.payment_id, true],
          ["Easypay URN", fee.bank_ref_no || g.BRN],
          ["Bank Transaction ID", fee.gateway_txn_id || g.TRN],
          ["Gateway Ref (RID)", g.RID || fee.easypay_settled_rid || fee.easypay_rid],
          ["Payment Mode", PAYMENT_MODES[fee.payment_mode_code || g.PMD] || (fee.payment_mode_code || g.PMD ? "Online" : null)],
          ["Payment Status", style.label],
          ["Bank Remark", g.RMK],
          ["Bank Txn Time", g.TET ? `${g.TET} IST` : null],
        ]);

        drawKvGrid(doc, "Application Details", [
          ["Application No.", fee.application_ref_no],
          ["Advertisement No.", fee.advt_no],
          ["Post Applied For", advt?.post_title?.en],
          ["Department", advt?.department?.departmentName],
          ["Class", advt?.class ? `Class ${advt.class}` : null],
        ]);

        drawKvGrid(doc, "Candidate Details", [
          ["Registration ID (OTR)", candidate?.registration_id || fee.registration_id],
          ["Candidate Name", candidate?.name],
          ["Father / Husband", candidate?.father_husband_name],
          ["Category", typeof candidate?.category === "string" ? candidate.category : candidate?.category?.label],
          ["Mobile", candidate?.mobile],
          ["Email", candidate?.email],
        ]);

        drawAmountTable(
          doc,
          [
            [`Application Fee${advt?.post_title?.en ? ` — ${advt.post_title.en}` : ""}`, fmtRs(fee.amount)],
            ["Convenience Fee", fmtRs(0)],
            ["GST on Convenience Fee", fmtRs(0)],
          ],
          fee.status === "paid" ? "Total Amount Paid" : "Total Amount (not received)",
          fmtRs(fee.amount),
          style.color,
        );

        drawNote(doc, style.note, style);

        drawUpscFooter(
          doc,
          `Generated on ${fmtDateTime(new Date())} · Computer-generated document · ${MUNICIPALITY_EN}`,
        );

        doc.end();
      } catch (err) {
        reject(err);
        doc.end();
      }
    })();
  });
