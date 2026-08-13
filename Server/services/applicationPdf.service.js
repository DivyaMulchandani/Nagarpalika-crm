import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import {
  UPSC_PAGE,
  drawUpscHeader,
  drawUpscIdentityGrid,
  drawUpscTable,
  drawUpscDeclaration,
  drawUpscFooter,
  loadImageBuffer,
} from "./pdfLayout.service.js";

const addrLine = (addr) => {
  if (!addr) return null;
  return [addr.line1, addr.line2, addr.taluka, addr.district, addr.pincode]
    .filter(Boolean)
    .join(", ");
};

const formatLanguages = (langs) => {
  if (!langs || !Array.isArray(langs) || !langs.length) return null;
  return langs
    .map((l) => {
      const skills = [
        l.read && "Read",
        l.write && "Write",
        l.speak && "Speak",
      ].filter(Boolean);
      return `${l.language} (${skills.join(", ") || "Known"})`;
    })
    .join(" ; ");
};

const formatDocs = (docs) => {
  if (!docs || !Array.isArray(docs) || !docs.length) return null;
  return docs
    .map(
      (d, i) =>
        `${i + 1}. ${d.label} (${d.is_compulsory ? "Compulsory" : "Optional"}) — Uploaded`,
    )
    .join("\n");
};

/**
 * Render candidate application confirmation as a UPSC-style official PDF.
 */
export const generateApplicationPdf = async (data, dest) => {
  const { application: app, candidate, advertisement: advt } = data;

  // Standard A4 document with 36pt (0.5 inch) margins for UPSC density
  const doc = new PDFDocument({ margin: 36, size: "A4" });

  await new Promise((resolve, reject) => {
    doc.on("error", reject);
    dest.on("error", reject);
    doc.on("end", resolve);
    doc.pipe(dest);

    (async () => {
      try {
        // Load photo, signature, and official municipal logo
        const photoBuffer = await loadImageBuffer(candidate?.photo_path);
        const signatureBuffer = await loadImageBuffer(
          candidate?.signature_path,
        );

        let logoBuffer = null;
        try {
          const possibleLogoPaths = [
            path.resolve(process.cwd(), "assets/np-logo.png"),
            path.resolve(process.cwd(), "../Admin/src/assets/images/np-logo.png"),
            path.resolve(process.cwd(), "Admin/src/assets/images/np-logo.png"),
          ];
          for (const p of possibleLogoPaths) {
            if (fs.existsSync(p)) {
              logoBuffer = await loadImageBuffer(p);
              if (logoBuffer) break;
            }
          }
        } catch {}

        // 1. UPSC Header
        drawUpscHeader(doc, {
          mainTitleEn: "PATAN NAGARPALIKA",
          subTitle: "ONLINE APPLICATION FORM",
          advtNo: app.advt_no || advt?.advt_no,
          postTitle: advt?.post_title?.en,
          department:
            advt?.department?.departmentName || advt?.department?.name,
          postClass: advt?.class,
          submittedAt: app.submitted_at || new Date(),
          logoBuffer,
        });

        // 2. Identity and Profile Declared by Candidate (with right-hand photo box)
        const identityRows = [
          ["Universal Registration Number (URN)", candidate?.registration_id],
          ["Application Number", app.application_ref_no],
          ["Full Name as declared by Candidate", candidate?.name],
          ["Father / Husband Name", candidate?.father_husband_name],
          ["E-mail ID", candidate?.email],
          ["Mobile Number", candidate?.mobile],
          ["Alternate Mobile", candidate?.alternate_mobile],
          [
            "Date of Birth",
            candidate?.dob
              ? new Date(candidate.dob).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })
              : null,
          ],
          [
            "Gender",
            app?.additional_fields?.gender || candidate?.gender,
          ],
          [
            "Category",
            candidate?.category
              ? candidate?.caste_cert_no
                ? `${candidate.category} (Caste Cert: ${candidate.caste_cert_no})`
                : candidate.category
              : null,
          ],
          ["Marital Status", candidate?.marital_status],
          ["Nationality", candidate?.nationality || "Indian"],
          ["Religion", candidate?.religion],
        ];
        drawUpscIdentityGrid(doc, identityRows, photoBuffer);

        // 3. Educational & Language Profile
        const educationRows = [
          [
            "Highest Educational Qualification",
            candidate?.qualification,
          ],
          ["Mother Tongue", candidate?.mother_tongue],
          ["Languages Known", formatLanguages(candidate?.languages)],
        ];
        drawUpscTable(doc, "Educational & Language Profile", educationRows);

        // 4. Address Details
        const currentAddr = candidate?.address_current?.same_as_permanent
          ? "Same as Permanent Address"
          : addrLine(candidate?.address_current);

        const addressRows = [
          ["Permanent Address", addrLine(candidate?.address_permanent)],
          ["Current / Correspondence Address", currentAddr],
        ];
        drawUpscTable(doc, "Address Details", addressRows);

        // 5. Special Category & Uploaded Documents
        const phDesc = candidate?.ph_status
          ? `Yes - ${candidate.ph_type || "PH"} (${candidate.ph_percentage || ""}% disability)`
          : "No";

        const specialRows = [
          ["Differently Abled (PH) Status", phDesc],
          [
            "Ex-Serviceman Status",
            candidate?.ex_serviceman ? "Yes" : "No",
          ],
          [
            "Declaration Accepted",
            app.declaration_accepted ? "Yes (Confirmed by Candidate)" : "Yes",
          ],
          ["Prescribed Documents Submitted", formatDocs(app.documents)],
        ];
        drawUpscTable(
          doc,
          "Special Category & Uploaded Documents",
          specialRows,
        );

        // 6. Declaration & Candidate Signature
        drawUpscDeclaration(doc, signatureBuffer);

        // 7. Footer
        drawUpscFooter(doc);

        doc.end();
      } catch (e) {
        reject(e);
      }
    })();
  });
};
