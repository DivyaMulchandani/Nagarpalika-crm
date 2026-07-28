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
 * Render a single candidate's full profile as a PDF, piped into `dest`.
 * Only fields with real values are shown; the photo sits at the top-right and
 * details are laid out as bordered label/value tables. Never rejects for a
 * missing/unreadable photo — the header just omits it.
 */
export const generateCandidatePdf = async (candidate, dest) => {
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
          title: "Candidate Profile",
          subtitle: "Nagar Palika Recruitment Portal",
          photoBuffer,
        });

        drawSection(doc, "Personal Details", [
          ["Registration ID", candidate.registration_id],
          ["Name", candidate.name],
          ["Father / Husband Name", candidate.father_husband_name],
          [
            "Date of Birth",
            candidate.dob
              ? new Date(candidate.dob).toLocaleDateString("en-IN")
              : null,
          ],
          ["Gender", candidate.gender],
          ["Category", candidate.category],
          ["Nationality", candidate.nationality],
          ["Religion", candidate.religion],
          ["Marital Status", candidate.marital_status],
          ["Mother Tongue", candidate.mother_tongue],
        ]);

        drawSection(doc, "Contact Details", [
          ["Mobile", candidate.mobile],
          ["Alternate Mobile", candidate.alternate_mobile],
          ["Email", candidate.email],
          ["OTR Status", candidate.otr_status],
        ]);

        drawSection(doc, "Permanent Address", [
          ["Address", addrLine(candidate.address_permanent)],
        ]);

        if (!candidate.address_current?.same_as_permanent) {
          drawSection(doc, "Current Address", [
            ["Address", addrLine(candidate.address_current)],
          ]);
        }

        drawSection(doc, "Qualification & Eligibility", [
          ["Qualification", candidate.qualification],
          ["Ex-Serviceman", candidate.ex_serviceman ? "Yes" : null],
          ["PH Type", candidate.ph_status ? candidate.ph_type : null],
          [
            "PH Percentage",
            candidate.ph_status ? candidate.ph_percentage : null,
          ],
          ["Caste Certificate No", candidate.caste_cert_no],
        ]);

        const languageRows = (candidate.languages || [])
          .filter((l) => l.language)
          .map((l) => {
            const skills = [
              l.read && "Read",
              l.write && "Write",
              l.speak && "Speak",
            ]
              .filter(Boolean)
              .join(", ");
            return [l.language, skills];
          });
        drawSection(doc, "Languages", languageRows);

        drawFooter(doc);
        doc.end();
      } catch (e) {
        reject(e);
      }
    })();
  });
};
