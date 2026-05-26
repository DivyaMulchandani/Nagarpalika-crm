// Requires: bun add pdfkit  (or npm install pdfkit)
import PDFDocument from "pdfkit";

// Escape and cap user-provided strings before PDF insertion
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
 * Pipes a PDF to `dest` (Express response stream).
 * @param {{ application, candidate, advertisement }} data
 * @param {import("express").Response} dest
 */
export const generateApplicationPdf = (data, dest) =>
  new Promise((resolve, reject) => {
    const { application: app, candidate, advertisement: advt } = data;

    const doc = new PDFDocument({ margin: 50, size: "A4" });
    doc.on("error", reject);
    dest.on("error", reject);
    doc.on("end", resolve);
    doc.pipe(dest);

    // ── Header ────────────────────────────────────────────────────────────────
    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .text("Online Application Form", { align: "center" });
    doc
      .fontSize(10)
      .font("Helvetica")
      .text("Nagar Palika Recruitment Portal", { align: "center" });
    doc.moveDown(0.5);
    divider(doc);

    // ── Application details ───────────────────────────────────────────────────
    sectionTitle(doc, "Application Details");
    row(doc, "Application Ref No", app.application_ref_no);
    row(doc, "Advertisement No", app.advt_no);
    if (advt) {
      row(doc, "Post Title", advt.post_title?.en);
      row(doc, "Department", advt.department?.name);
    }
    row(doc, "Status", app.status);
    row(
      doc,
      "Submitted At",
      app.submitted_at
        ? new Date(app.submitted_at).toLocaleString("en-IN")
        : null,
    );

    // ── Candidate details ─────────────────────────────────────────────────────
    sectionTitle(doc, "Candidate Details");
    if (candidate) {
      row(doc, "Registration ID", candidate.registration_id);
      row(doc, "Name", candidate.name);
      row(doc, "Father / Husband Name", candidate.father_husband_name);
      row(
        doc,
        "Date of Birth",
        candidate.dob
          ? new Date(candidate.dob).toLocaleDateString("en-IN")
          : null,
      );
      row(doc, "Gender", candidate.gender?.label);
      row(doc, "Category", candidate.category?.label);
      row(doc, "Nationality", candidate.nationality);
      row(doc, "Mobile", candidate.mobile);
      row(doc, "Email", candidate.email);
      row(doc, "Qualification", candidate.qualification?.label);
      row(doc, "Marital Status", candidate.marital_status?.label);
      if (candidate.ph_status) {
        row(doc, "PH Type", candidate.ph_type?.label);
        row(doc, "PH Percentage", candidate.ph_percentage);
      }
    }

    // ── Permanent address ─────────────────────────────────────────────────────
    if (candidate?.address_permanent) {
      sectionTitle(doc, "Permanent Address");
      const a = candidate.address_permanent;
      row(
        doc,
        "Address",
        [a.line1, a.line2, a.taluka, a.district, a.pincode]
          .filter(Boolean)
          .join(", "),
      );
    }

    // ── Application scaffold fields ───────────────────────────────────────────
    sectionTitle(doc, "Application Fields");
    row(doc, "Exam Centre", app.exam_centre);
    row(doc, "Experience (years)", app.experience_years ?? "—");
    row(doc, "Declaration Accepted", app.declaration_accepted ? "Yes" : "No");

    // ── Footer ────────────────────────────────────────────────────────────────
    doc.moveDown(1);
    divider(doc);
    doc
      .fontSize(8)
      .fillColor("#666666")
      .text(
        `Generated: ${new Date().toLocaleString("en-IN")} · System-generated document.`,
        { align: "center" },
      );

    doc.end();
  });
