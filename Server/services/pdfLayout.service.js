import fs from "fs";
import path from "path";
import { getReadStream, normalizeKey } from "./storage.service.js";

// pdfkit can only embed JPEG/PNG, but uploaded photos are stored as WebP, so we
// convert with sharp before embedding. Loaded lazily/once to tolerate absence.
let sharpModule = null;
let sharpLoaded = false;
const getSharp = async () => {
  if (!sharpLoaded) {
    sharpLoaded = true;
    try {
      sharpModule = (await import("sharp")).default;
    } catch {
      sharpModule = null;
    }
  }
  return sharpModule;
};

// Standard Legacy Constants (for admin profile export)
const PAGE = { left: 50, right: 545, top: 50 };
const PHOTO = { w: 90, h: 110 };
const LABEL_W = 165;
const PAD = 6;
const FONT_SIZE = 9.5;

const COLOR = {
  heading: "#6d235f",
  headingText: "#ffffff",
  labelBg: "#faf4f9",
  labelText: "#1e293b",
  value: "#0f172a",
  border: "#9b508d",
  rule: "#b874ad",
  muted: "#64748b",
};

// UPSC Theme Constants (Logo Purple Theme)
export const UPSC_PAGE = {
  left: 36,
  right: 559.28,
  width: 523.28,
  purple: "#6d235f",
  border: "#9b508d",
  blue: "#6d235f", // alias for backward compatibility
  gridBorder: "#9b508d",
  text: "#111827",
  muted: "#4b5563",
};

export const isEmpty = (value) =>
  value === null ||
  value === undefined ||
  (typeof value === "string" && value.trim() === "");

/**
 * Load an S3-stored or local disk image and return a pdfkit-embeddable buffer (PNG), or null.
 */
export const loadImageBuffer = async (imgPath) => {
  if (!imgPath) return null;

  // Check if it's an existing local file
  try {
    if (typeof imgPath === "string" && fs.existsSync(imgPath)) {
      const raw = fs.readFileSync(imgPath);
      const sharp = await getSharp();
      if (sharp) {
        try {
          return await sharp(raw).png().toBuffer();
        } catch {}
      }
      return raw;
    }
  } catch {}

  // Otherwise fetch from S3 storage
  try {
    const key = normalizeKey(imgPath);
    if (!key) return null;
    const stream = await getReadStream(key);
    if (!stream) return null;
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const raw = Buffer.concat(chunks);

    const ext = path.extname(key || "").toLowerCase();
    if (ext === ".webp") {
      const sharp = await getSharp();
      if (sharp) {
        try {
          return await sharp(raw).png().toBuffer();
        } catch {
          /* not a decodable image — fall back to the raw bytes */
        }
      }
    }
    return raw;
  } catch {
    return null;
  }
};

const contentBottom = (doc) => doc.page.height - doc.page.margins.bottom;

export const ensureSpace = (doc, needed) => {
  if (doc.y + needed > contentBottom(doc)) {
    doc.addPage();
    doc.y = doc.page.margins.top;
  }
};

// ============================================================================
// UPSC APPLICATION FORM RENDERERS
// ============================================================================

/**
 * Draws the official UPSC-style top header with dual emblems, municipality titles,
 * solid purple exam banner, and centered submission timestamp.
 */
export const drawUpscHeader = (
  doc,
  {
    mainTitleGu = "પાટણ નગરપાલિકા",
    mainTitleEn = "PATAN NAGARPALIKA",
    subTitle = "ONLINE APPLICATION CONFIRMATION",
    bannerText,
    advtNo,
    postTitle,
    department,
    postClass,
    submittedAt,
    submittedLabel = "Application Submitted On",
    logoBuffer,
  },
) => {
  const { left, width, purple, border } = UPSC_PAGE;

  const startY = doc.y;
  const headerHeight = 54;

  // Outer frame for the municipal header in light purple border
  doc.lineWidth(0.8).strokeColor(border);
  doc.rect(left, startY, width, headerHeight).stroke();

  // Left Emblem / Logo
  if (logoBuffer) {
    try {
      doc.image(logoBuffer, left + 8, startY + 5, {
        fit: [44, 44],
        align: "center",
        valign: "center",
      });
    } catch {}
  }

  // Centered Municipality Title & Subtitle in Logo Purple
  doc
    .font("Helvetica-Bold")
    .fontSize(12.5)
    .fillColor(purple)
    .text(mainTitleEn, left, startY + 11, { width, align: "center" });

  doc
    .font("Helvetica-Bold")
    .fontSize(9.5)
    .fillColor(purple)
    .text(subTitle, left, startY + 28, { width, align: "center" });

  doc.y = startY + headerHeight;

  // Exam / Advertisement Bar (Solid Purple Box)
  const examBarY = doc.y;
  const examBarHeight = 22;
  doc.rect(left, examBarY, width, examBarHeight).fill(purple);

  const parts = [];
  if (advtNo) parts.push(`Advt. No : ${advtNo}`);
  if (postTitle) parts.push(`Post : ${postTitle}`);
  if (department) parts.push(`(${department})`);
  if (postClass) parts.push(`Class ${postClass}`);
  const examText =
    bannerText ||
    (parts.length
      ? parts.join("   |   ")
      : "ONE-TIME REGISTRATION (OTR) PROFILE");

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor("#ffffff")
    .text(examText, left + 4, examBarY + 5.5, {
      width: width - 8,
      align: "center",
    });

  doc.y = examBarY + examBarHeight + 7;

  // Centered Submission Timestamp
  if (submittedAt) {
    const dateObj =
      submittedAt instanceof Date ? submittedAt : new Date(submittedAt);
    const dateStr = !isNaN(dateObj)
      ? dateObj.toLocaleString("en-IN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      : String(submittedAt);

    doc
      .font("Helvetica-Bold")
      .fontSize(10.5)
      .fillColor("#111827")
      .text(`${submittedLabel}: ${dateStr}`, left, doc.y, {
        width,
        align: "center",
      });
    doc.y += 8;
  }
};

/**
 * Centered Section Header Banner (Solid purple with bold white centered text)
 */
export const drawUpscCenteredSection = (doc, title) => {
  const { left, width, purple } = UPSC_PAGE;
  ensureSpace(doc, 22);
  const y = doc.y;
  doc.rect(left, y, width, 18).fill(purple);
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor("#ffffff")
    .text(String(title), left + 4, y + 4.5, {
      width: width - 8,
      align: "center",
    });
  doc.y = y + 18;
  doc.fillColor(UPSC_PAGE.text);
};

/**
 * Section 1: Candidate Identity Table with Integrated Right Photo Box
 */
export const drawUpscIdentityGrid = (doc, rows, photoBuffer) => {
  const { left, width, border } = UPSC_PAGE;
  const labelW = 150;
  const valW = 260;
  const photoColW = width - labelW - valW; // ~113.28pt
  const pad = 4;
  const fontSize = 8.5;

  const validRows = rows.filter(([, v]) => !isEmpty(v));
  if (!validRows.length) return;

  drawUpscCenteredSection(doc, "Identity and Profile Declared by Candidate");

  // Calculate row heights
  const rowHeights = validRows.map(([label, value]) => {
    doc.font("Helvetica-Bold").fontSize(fontSize);
    const lh = doc.heightOfString(String(label), { width: labelW - pad * 2 });
    doc.font("Helvetica").fontSize(fontSize);
    const vh = doc.heightOfString(String(value), { width: valW - pad * 2 });
    return Math.max(lh, vh, fontSize) + pad * 2;
  });

  const totalGridH = rowHeights.reduce((a, b) => a + b, 0);
  ensureSpace(doc, totalGridH + 6);

  const startY = doc.y;
  let currentY = startY;

  validRows.forEach(([label, value], i) => {
    const rH = rowHeights[i];
    doc.lineWidth(0.5).strokeColor(border);

    // Label cell
    doc.rect(left, currentY, labelW, rH).stroke();
    // Value cell
    doc.rect(left + labelW, currentY, valW, rH).stroke();

    doc
      .fillColor("#111827")
      .font("Helvetica-Bold")
      .fontSize(fontSize)
      .text(String(label), left + pad, currentY + pad, {
        width: labelW - pad * 2,
      });

    doc
      .fillColor("#111827")
      .font("Helvetica")
      .fontSize(fontSize)
      .text(String(value), left + labelW + pad, currentY + pad, {
        width: valW - pad * 2,
      });

    currentY += rH;
  });

  // Right Photo Column (Spanning entire height of identity rows)
  const photoX = left + labelW + valW;
  doc.lineWidth(0.5).strokeColor(border);
  doc.rect(photoX, startY, photoColW, totalGridH).stroke();

  if (photoBuffer) {
    try {
      const maxPhotoW = photoColW - 8;
      const maxPhotoH = Math.min(totalGridH - 8, 130);
      const photoY =
        startY + (totalGridH > maxPhotoH ? (totalGridH - maxPhotoH) / 2 : 4);
      doc.image(photoBuffer, photoX + 4, photoY, {
        fit: [maxPhotoW, maxPhotoH],
        align: "center",
        valign: "center",
      });
    } catch {}
  } else {
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(UPSC_PAGE.muted)
      .text("Photo", photoX, startY + totalGridH / 2 - 4, {
        width: photoColW,
        align: "center",
      });
  }

  doc.y = currentY + 6;
};

/**
 * Standard UPSC 2-Column Table for other sections (Educational Profile, Address, Special Categories)
 */
export const drawUpscTable = (doc, title, rows) => {
  const validRows = rows.filter(([, v]) => !isEmpty(v));
  if (!validRows.length) return;

  const { left, width, border } = UPSC_PAGE;
  const labelW = 160;
  const valW = width - labelW;
  const pad = 4;
  const fontSize = 8.5;

  drawUpscCenteredSection(doc, title);

  validRows.forEach(([label, value]) => {
    doc.font("Helvetica-Bold").fontSize(fontSize);
    const lh = doc.heightOfString(String(label), { width: labelW - pad * 2 });
    doc.font("Helvetica").fontSize(fontSize);
    const vh = doc.heightOfString(String(value), { width: valW - pad * 2 });
    const rH = Math.max(lh, vh, fontSize) + pad * 2;

    ensureSpace(doc, rH);
    const y = doc.y;

    doc.lineWidth(0.5).strokeColor(border);
    doc.rect(left, y, labelW, rH).stroke();
    doc.rect(left + labelW, y, valW, rH).stroke();

    doc
      .fillColor("#111827")
      .font("Helvetica-Bold")
      .fontSize(fontSize)
      .text(String(label), left + pad, y + pad, { width: labelW - pad * 2 });

    doc
      .fillColor("#111827")
      .font("Helvetica")
      .fontSize(fontSize)
      .text(String(value), left + labelW + pad, y + pad, {
        width: valW - pad * 2,
      });

    doc.y = y + rH;
  });

  doc.y += 6;
};

/**
 * Section 5: Official Legal Declaration Box with Candidate Signature on Bottom Right
 */
export const drawUpscDeclaration = (doc, signatureBuffer) => {
  const { left, width, border } = UPSC_PAGE;
  const pad = 6;
  const fontSize = 8;

  ensureSpace(doc, 140);
  drawUpscCenteredSection(doc, "Declaration");

  const startY = doc.y;

  const points = [
    "1. I hereby declare that all statements made in this application are true, complete and correct to the best of my knowledge and belief. In the event of any information being found false or incorrect or ineligibility being detected before or after the examination/selection, action can be taken against me by the Nagarpalika Administration as per the rules.",
    "2. I have read the provisions in the notification and rules carefully and hereby undertake to abide by them. I further declare that I fulfil all the conditions of eligibility regarding age limits, educational qualifications etc. prescribed for admission to the recruitment.",
    "3. I have informed my Head of Office/Department in writing that I am applying for this post.* (*Applicable for those who are already in government/semi-government service).",
  ];

  let textY = startY + pad;
  doc.font("Helvetica").fontSize(fontSize).fillColor("#111827");

  points.forEach((pt) => {
    const ptH = doc.heightOfString(pt, { width: width - pad * 2 });
    doc.text(pt, left + pad, textY, { width: width - pad * 2, lineGap: 1.5 });
    textY += ptH + 4;
  });

  const sigBoxW = 140;
  const sigBoxH = 45;
  const sigX = left + width - sigBoxW - pad - 6;
  const sigY = textY + 2;

  if (signatureBuffer) {
    try {
      doc.image(signatureBuffer, sigX, sigY, {
        fit: [sigBoxW, sigBoxH],
        align: "center",
        valign: "center",
      });
    } catch {}
  }

  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#4b5563")
    .text("(Signature)", sigX, sigY + sigBoxH + 2, {
      width: sigBoxW,
      align: "center",
    });

  const totalH = sigY + sigBoxH + 16 - startY;

  // Outer framing around declaration in light purple
  doc.lineWidth(0.5).strokeColor(border);
  doc.rect(left, startY, width, totalH).stroke();

  doc.y = startY + totalH + 6;
};

/**
 * UPSC Bottom Footer
 */
export const drawUpscFooter = (doc, customText) => {
  const { left, width, border } = UPSC_PAGE;
  ensureSpace(doc, 20);
  doc.lineWidth(0.5).strokeColor(border);
  doc.moveTo(left, doc.y).lineTo(left + width, doc.y).stroke();
  doc.y += 4;
  const footerText =
    customText ||
    `Generated on: ${new Date().toLocaleString("en-IN")} · Computer Generated Document · Patan Nagarpalika`;
  doc
    .font("Helvetica")
    .fontSize(7.5)
    .fillColor("#6b7280")
    .text(footerText, left, doc.y, { width, align: "center" });
};

// ============================================================================
// LEGACY HELPERS (for admin candidate profile ZIP export)
// ============================================================================

export const drawHeader = (doc, { title, subtitle, photoBuffer }) => {
  const top = PAGE.top;
  const textWidth = PAGE.right - PAGE.left - PHOTO.w - 20;

  if (photoBuffer) {
    const x = PAGE.right - PHOTO.w;
    try {
      doc.image(photoBuffer, x, top, {
        fit: [PHOTO.w, PHOTO.h],
        align: "center",
        valign: "center",
      });
    } catch {}
    doc
      .lineWidth(1)
      .strokeColor(COLOR.border)
      .rect(x, top, PHOTO.w, PHOTO.h)
      .stroke();
  }

  doc
    .fillColor(COLOR.value)
    .font("Helvetica-Bold")
    .fontSize(18)
    .text(title, PAGE.left, top + 4, { width: textWidth });
  if (subtitle) {
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(COLOR.muted)
      .text(subtitle, PAGE.left, doc.y + 2, { width: textWidth });
  }

  doc.y = top + (photoBuffer ? PHOTO.h : 44) + 12;
  doc.x = PAGE.left;
  doc
    .lineWidth(1)
    .strokeColor(COLOR.rule)
    .moveTo(PAGE.left, doc.y)
    .lineTo(PAGE.right, doc.y)
    .stroke();
  doc.y += 12;
  doc.fillColor(COLOR.value);
};

const sectionHeading = (doc, title) => {
  ensureSpace(doc, 24 + 26);
  const width = PAGE.right - PAGE.left;
  const y = doc.y;
  doc.rect(PAGE.left, y, width, 20).fill(COLOR.heading);
  doc
    .fillColor(COLOR.headingText)
    .font("Helvetica-Bold")
    .fontSize(10)
    .text(String(title).toUpperCase(), PAGE.left + PAD, y + 6, {
      width: width - PAD * 2,
    });
  doc.y = y + 20;
  doc.fillColor(COLOR.value);
};

const drawRow = (doc, label, value) => {
  const totalW = PAGE.right - PAGE.left;
  const valueW = totalW - LABEL_W;
  const labelText = String(label);
  const valueText = String(value);

  doc.font("Helvetica-Bold").fontSize(FONT_SIZE);
  const labelH = doc.heightOfString(labelText, { width: LABEL_W - PAD * 2 });
  doc.font("Helvetica").fontSize(FONT_SIZE);
  const valueH = doc.heightOfString(valueText, { width: valueW - PAD * 2 });
  const rowH = Math.max(labelH, valueH, FONT_SIZE) + PAD * 2;

  ensureSpace(doc, rowH);
  const y = doc.y;

  doc.rect(PAGE.left, y, LABEL_W, rowH).fill(COLOR.labelBg);
  doc.lineWidth(0.5).strokeColor(COLOR.border);
  doc.rect(PAGE.left, y, LABEL_W, rowH).stroke();
  doc.rect(PAGE.left + LABEL_W, y, valueW, rowH).stroke();

  doc
    .fillColor(COLOR.labelText)
    .font("Helvetica-Bold")
    .fontSize(FONT_SIZE)
    .text(labelText, PAGE.left + PAD, y + PAD, { width: LABEL_W - PAD * 2 });
  doc
    .fillColor(COLOR.value)
    .font("Helvetica")
    .fontSize(FONT_SIZE)
    .text(valueText, PAGE.left + LABEL_W + PAD, y + PAD, {
      width: valueW - PAD * 2,
    });

  doc.y = y + rowH;
};

export const drawSection = (doc, title, rows) => {
  const present = rows.filter(([, value]) => !isEmpty(value));
  if (!present.length) return;
  sectionHeading(doc, title);
  present.forEach(([label, value]) => drawRow(doc, label, value));
  doc.moveDown(0.6);
};

export const drawFooter = (doc) => {
  ensureSpace(doc, 26);
  doc.moveDown(0.3);
  doc
    .lineWidth(0.5)
    .strokeColor(COLOR.border)
    .moveTo(PAGE.left, doc.y)
    .lineTo(PAGE.right, doc.y)
    .stroke();
  doc.y += 6;
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(COLOR.muted)
    .text(
      `Generated: ${new Date().toLocaleString("en-IN")} · System-generated document.`,
      PAGE.left,
      doc.y,
      { width: PAGE.right - PAGE.left, align: "center" },
    );
  doc.fillColor(COLOR.value);
};
