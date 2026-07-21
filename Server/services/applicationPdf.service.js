import PDFDocument from "pdfkit";
import {
  drawHeader,
  drawSection,
  drawFooter,
  loadImageBuffer,
} from "./pdfLayout.service.js";

const addrLine = (addr) => {
  if (!addr) return null;
  return [addr.line1, addr.line2, addr.taluka, addr.district, addr.pincode]
    .filter(Boolean)
    .join(", ");
};

/**
 * Render an application (with its candidate + advertisement) as a PDF, piped
 * into `dest`. Only fields with real values are shown; the candidate photo sits
 * at the top-right and details are laid out as bordered label/value tables.
 */
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
        const photoBuffer = await loadImageBuffer(candidate?.photo_path);
        drawHeader(doc, {
          title: "Online Application Form",
          subtitle: "Nagar Palika Recruitment Portal",
          photoBuffer,
        });

        drawSection(doc, "Application Details", [
          ["Application Ref No", app.application_ref_no],
          ["Advertisement No", app.advt_no],
          ["Post Title", advt?.post_title?.en],
          [
            "Department",
            advt?.department?.departmentName || advt?.department?.name,
          ],
          ["Status", app.status],
          [
            "Submitted At",
            app.submitted_at
              ? new Date(app.submitted_at).toLocaleString("en-IN")
              : null,
          ],
        ]);

        drawSection(doc, "Candidate Details", [
          ["Registration ID", candidate?.registration_id],
          ["Name", candidate?.name],
          ["Father / Husband Name", candidate?.father_husband_name],
          [
            "Date of Birth",
            candidate?.dob
              ? new Date(candidate.dob).toLocaleDateString("en-IN")
              : null,
          ],
          ["Gender", candidate?.gender],
          ["Category", candidate?.category],
          ["Nationality", candidate?.nationality],
          ["Religion", candidate?.religion],
          ["Mobile", candidate?.mobile],
          ["Alternate Mobile", candidate?.alternate_mobile],
          ["Email", candidate?.email],
          ["Qualification", candidate?.qualification],
          ["Marital Status", candidate?.marital_status],
          ["PH Type", candidate?.ph_status ? candidate?.ph_type : null],
          [
            "PH Percentage",
            candidate?.ph_status ? candidate?.ph_percentage : null,
          ],
        ]);

        drawSection(doc, "Permanent Address", [
          ["Address", addrLine(candidate?.address_permanent)],
        ]);

        if (
          candidate?.address_current &&
          !candidate.address_current.same_as_permanent
        ) {
          drawSection(doc, "Current Address", [
            ["Address", addrLine(candidate.address_current)],
          ]);
        }

        drawSection(doc, "Application Fields", [
          ["Exam Centre", app.exam_centre],
          ["Experience (years)", app.experience_years],
          ["Declaration Accepted", app.declaration_accepted ? "Yes" : "No"],
        ]);

        const documentRows = (app.documents || []).map((d, i) => [
          `Document ${i + 1}`,
          `${d.label} (${d.is_compulsory ? "Compulsory" : "Optional"})`,
        ]);
        drawSection(doc, "Submitted Documents", documentRows);

        drawFooter(doc);
        doc.end();
      } catch (e) {
        reject(e);
      }
    })();
  });
};
