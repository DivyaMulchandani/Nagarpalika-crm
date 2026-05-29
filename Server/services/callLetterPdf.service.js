// Requires: bun add pdfkit  (same dependency as applicationPdf.service.js)
import PDFDocument from "pdfkit";

const esc = (v) => String(v ?? "—").slice(0, 500);

const row = (doc, label, value) => {
  doc.font("Helvetica-Bold").text(`${label}: `, { continued: true });
  doc.font("Helvetica").text(esc(value));
};

const sectionTitle = (doc, title) => {
  doc.moveDown(0.5);
  doc
    .fontSize(11)
    .font("Helvetica-Bold")
    .fillColor("#333333")
    .text(title.toUpperCase(), { underline: true });
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor("#000000");
};

const divider = (doc) => {
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#aaaaaa").stroke();
  doc.moveDown(0.5);
};

/**
 * Pipes a call letter PDF to `dest` (Express response stream).
 * @param {{ callLetter, candidate, advertisement }} data
 * @param {import("express").Response} dest
 */
export const generateCallLetterPdf = (data, dest) =>
  new Promise((resolve, reject) => {
    const { callLetter: cl, candidate, advertisement: advt } = data;

    const doc = new PDFDocument({ margin: 50, size: "A4" });
    doc.on("error", reject);
    dest.on("error", reject);
    doc.on("end", resolve);
    doc.pipe(dest);

    // ── Header ────────────────────────────────────────────────────────────────
    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .text("Admit Card / Call Letter", { align: "center" });
    doc
      .fontSize(10)
      .font("Helvetica")
      .text("Nagar Palika Recruitment Portal", { align: "center" });
    doc.moveDown(0.5);
    divider(doc);

    // ── Examination details ───────────────────────────────────────────────────
    sectionTitle(doc, "Examination Details");
    row(doc, "Advertisement No", cl.advt_no);
    if (advt) row(doc, "Post Title", advt.post_title?.en);
    row(
      doc,
      "Exam Date",
      cl.exam_date ? new Date(cl.exam_date).toLocaleDateString("en-IN") : null,
    );
    row(doc, "Exam Time", cl.exam_time);
    row(doc, "Venue", cl.venue);

    // ── Candidate details ─────────────────────────────────────────────────────
    sectionTitle(doc, "Candidate Details");
    if (candidate) {
      row(doc, "Name", candidate.name);
      row(doc, "Registration ID", candidate.registration_id);
      row(doc, "Category", candidate.category?.label ?? candidate.category);
      row(
        doc,
        "Date of Birth",
        candidate.dob
          ? new Date(candidate.dob).toLocaleDateString("en-IN")
          : null,
      );
    }
    row(doc, "Roll Number", cl.roll_number);

    // ── Reporting instructions ────────────────────────────────────────────────
    if (cl.reporting_instructions) {
      sectionTitle(doc, "Reporting Instructions");
      doc
        .font("Helvetica")
        .text(esc(cl.reporting_instructions), { width: 495 });
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    doc.moveDown(1);
    divider(doc);
    doc
      .fontSize(8)
      .fillColor("#666666")
      .text(
        `Generated: ${new Date().toLocaleString("en-IN")} · Bring this admit card to the examination centre.`,
        { align: "center" },
      );

    doc.end();
  });
