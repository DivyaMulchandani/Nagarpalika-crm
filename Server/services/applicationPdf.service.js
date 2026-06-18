import PDFDocument from "pdfkit";
import { getReadStream, normalizeKey } from "./storage.service.js";

const esc = (v) => String(v ?? "—").slice(0, 500);
const fieldVal = (v) => (typeof v === "object" && v?.label ? v.label : v);

const row = (doc, label, value) => {
  doc.font("Helvetica-Bold").text(`${label}: `, { continued: true });
  doc.font("Helvetica").text(esc(fieldVal(value)));
};

const sectionTitle = (doc, title) => {
  doc.moveDown(0.5);
  doc.fontSize(11).font("Helvetica-Bold").fillColor("#333333").text(title.toUpperCase(), { underline: true });
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor("#000000");
};

const divider = (doc) => {
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#aaaaaa").stroke();
  doc.moveDown(0.5);
};

const addrLine = (addr) => {
  if (!addr) return null;
  return [addr.line1, addr.line2, addr.taluka, addr.district, addr.pincode].filter(Boolean).join(", ");
};

const loadPhotoBuffer = async (photoPath) => {
  const key = normalizeKey(photoPath);
  if (!key) return null;
  const stream = await getReadStream(key);
  if (stream) {
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
  }
  return null;
};

export const generateApplicationPdf = async (data, dest) => {
  const { application: app, candidate, advertisement: advt } = data;

  const doc = new PDFDocument({ margin: 50, size: "A4" });
  await new Promise((resolve, reject) => {
    doc.on("error", reject);
    dest.on("error", reject);
    doc.on("end", resolve);
    doc.pipe(dest);

    (async () => {
      try {
        const photoBuf = await loadPhotoBuffer(candidate?.photo_path);
        if (photoBuf) {
          try { doc.image(photoBuf, 455, 50, { width: 80, height: 100, fit: [80, 100] }); } catch { /* skip */ }
        }

        doc.fontSize(16).font("Helvetica-Bold").text("Online Application Form", { align: "center" });
        doc.fontSize(10).font("Helvetica").text("Nagar Palika Recruitment Portal", { align: "center" });
        doc.moveDown(0.5);
        divider(doc);

        sectionTitle(doc, "Application Details");
        row(doc, "Application Ref No", app.application_ref_no);
        row(doc, "Advertisement No", app.advt_no);
        if (advt) {
          row(doc, "Post Title", advt.post_title?.en);
          row(doc, "Department", advt.department?.departmentName || advt.department?.name);
        }
        row(doc, "Status", app.status);
        row(doc, "Submitted At", app.submitted_at ? new Date(app.submitted_at).toLocaleString("en-IN") : null);

        sectionTitle(doc, "Candidate Details");
        if (candidate) {
          row(doc, "Registration ID", candidate.registration_id);
          row(doc, "Name", candidate.name);
          row(doc, "Father / Husband Name", candidate.father_husband_name);
          row(doc, "Date of Birth", candidate.dob ? new Date(candidate.dob).toLocaleDateString("en-IN") : null);
          row(doc, "Gender", candidate.gender);
          row(doc, "Category", candidate.category);
          row(doc, "Nationality", candidate.nationality);
          row(doc, "Religion", candidate.religion);
          row(doc, "Mobile", candidate.mobile);
          row(doc, "Alternate Mobile", candidate.alternate_mobile);
          row(doc, "Email", candidate.email);
          row(doc, "Qualification", candidate.qualification);
          row(doc, "Marital Status", candidate.marital_status);
          if (candidate.ph_status || candidate.ph_type) {
            row(doc, "PH Type", candidate.ph_type);
            row(doc, "PH Percentage", candidate.ph_percentage);
          }
        }

        if (candidate?.address_permanent) {
          sectionTitle(doc, "Permanent Address");
          row(doc, "Address", addrLine(candidate.address_permanent));
        }

        if (candidate?.address_current && !candidate.address_current.same_as_permanent) {
          sectionTitle(doc, "Current Address");
          row(doc, "Address", addrLine(candidate.address_current));
        }

        sectionTitle(doc, "Application Fields");
        row(doc, "Exam Centre", app.exam_centre);
        row(doc, "Experience (years)", app.experience_years ?? "—");
        row(doc, "Declaration Accepted", app.declaration_accepted ? "Yes" : "No");

        if (app.documents?.length) {
          sectionTitle(doc, "Submitted Documents");
          app.documents.forEach((d, i) => {
            row(doc, `Document ${i + 1}`, `${d.label} (${d.is_compulsory ? "Compulsory" : "Optional"})`);
          });
        }

        doc.moveDown(1);
        divider(doc);
        doc.fontSize(8).fillColor("#666666").text(
          `Generated: ${new Date().toLocaleString("en-IN")} · System-generated document.`,
          { align: "center" },
        );

        doc.end();
      } catch (e) {
        reject(e);
      }
    })();
  });
};
