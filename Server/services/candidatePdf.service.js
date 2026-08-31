import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import {
  UPSC_PAGE,
  ensureSpace,
  drawUpscHeader,
  drawUpscIdentityGrid,
  drawUpscTable,
  drawUpscFooter,
  loadImageBuffer,
} from "./pdfLayout.service.js";

const addrLine = (addr) => {
  if (!addr) return "—";
  if (typeof addr === "string") return addr.trim() || "—";
  const parts = [
    addr.line1,
    addr.line2,
    addr.taluka,
    addr.district,
    addr.pincode,
  ]
    .filter(Boolean)
    .join(", ");
  return parts || "—";
};

const formatLanguages = (langs) => {
  if (!langs || !Array.isArray(langs) || !langs.length) return "—";
  const formatted = langs
    .filter((l) => l && l.language)
    .map((l) => {
      const skills = [
        l.read && "Read",
        l.write && "Write",
        l.speak && "Speak",
      ].filter(Boolean);
      return `${l.language} (${skills.join(", ") || "Known"})`;
    });
  return formatted.length ? formatted.join(" ; ") : "—";
};

/**
 * Render a single candidate's full profile as a UPSC-style official PDF.
 * Maps all fields captured during candidate registration.
 */
export const generateCandidatePdf = async (candidate, dest) => {
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
            path.resolve(
              process.cwd(),
              "../Admin/src/assets/images/np-logo.png",
            ),
            path.resolve(
              process.cwd(),
              "Admin/src/assets/images/np-logo.png",
            ),
          ];
          for (const p of possibleLogoPaths) {
            if (fs.existsSync(p)) {
              logoBuffer = await loadImageBuffer(p);
              if (logoBuffer) break;
            }
          }
        } catch {}

        // 1. Official Municipal Header (Candidate Registration Profile)
        drawUpscHeader(doc, {
          mainTitleEn: "PATAN NAGARPALIKA",
          subTitle: "CANDIDATE REGISTRATION PROFILE",
          bannerText: "ONE-TIME REGISTRATION (OTR) PROFILE",
          submittedLabel: "Registration Date",
          submittedAt: candidate?.createdAt || new Date(),
          logoBuffer,
        });

        // 2. Identity and Profile Declared by Candidate (with right-hand photo box)
        const identityRows = [
          ["Universal Registration Number (URN)", candidate?.registration_id || "—"],
          ["Full Name as declared by Candidate", candidate?.name || "—"],
          ["Father / Husband Name", candidate?.father_husband_name || "—"],
          ["E-mail ID", candidate?.email || "—"],
          ["Mobile Number", candidate?.mobile || "—"],
          ["Alternate Mobile", candidate?.alternate_mobile || "—"],
          [
            "Date of Birth",
            candidate?.dob
              ? new Date(candidate.dob).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })
              : "—",
          ],
          ["Gender", candidate?.gender || "—"],
          [
            "Category",
            candidate?.category
              ? candidate?.caste_cert_no
                ? `${candidate.category} (Caste Cert: ${candidate.caste_cert_no})`
                : candidate.category
              : "—",
          ],
          ["Marital Status", candidate?.marital_status || "—"],
          ["Nationality", candidate?.nationality || "Indian"],
          ["Religion", candidate?.religion || "—"],
          [
            "Registration Status",
            candidate?.otr_status === "complete"
              ? "Completed"
              : candidate?.otr_status || "Active",
          ],
        ];
        drawUpscIdentityGrid(doc, identityRows, photoBuffer);

        // 3. Educational & Language Profile
        const educationRows = [
          [
            "Highest Educational Qualification",
            candidate?.qualification || "—",
          ],
          ["Mother Tongue", candidate?.mother_tongue || "—"],
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

        // 5. Special Category & Differently Abled Status
        const phDesc = candidate?.ph_status
          ? `Yes - ${candidate.ph_type || "Physically Handicapped"} (${candidate.ph_percentage || 0}% disability)`
          : "No";

        const specialRows = [
          ["Differently Abled (PH) Status", phDesc],
          [
            "Ex-Serviceman Status",
            candidate?.ex_serviceman ? "Yes" : "No",
          ],
          [
            "Caste Certificate No",
            candidate?.caste_cert_no || "N/A",
          ],
        ];
        drawUpscTable(
          doc,
          "Special Category & Differently Abled Status",
          specialRows,
        );

        // 6. Candidate Signature (Framed in Light Purple Border)
        const { left, width, border } = UPSC_PAGE;
        ensureSpace(doc, 75);

        const sigBoxW = 140;
        const sigBoxH = 45;
        const sigY = doc.y + 10;
        const sigX = left + width - sigBoxW - 8;

        doc.lineWidth(0.5).strokeColor(border);
        doc.rect(sigX, sigY, sigBoxW, sigBoxH).stroke();

        if (signatureBuffer) {
          try {
            doc.image(signatureBuffer, sigX + 2, sigY + 2, {
              fit: [sigBoxW - 4, sigBoxH - 4],
              align: "center",
              valign: "center",
            });
          } catch {}
        }

        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor("#4b5563")
          .text("Candidate Signature", sigX, sigY + sigBoxH + 4, {
            width: sigBoxW,
            align: "center",
          });

        doc.y = sigY + sigBoxH + 18;

        // 7. System Footer
        drawUpscFooter(
          doc,
          `Generated on: ${new Date().toLocaleString("en-IN")} · Computer Generated Candidate Profile · Patan Nagarpalika`,
        );

        doc.end();
      } catch (e) {
        reject(e);
      }
    })();
  });
};
