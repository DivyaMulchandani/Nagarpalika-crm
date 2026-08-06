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

/**
 * Shared PDF layout helpers so the candidate profile PDF (admin ZIP) and the
 * application PDF (website print) render with one consistent, professional look:
 * a titled header with the photo on the right, and bordered two-column
 * (label | value) tables that only include fields that actually have a value.
 */

// A4 with 50pt margins → printable band is x:[50, 545].
const PAGE = { left: 50, right: 545, top: 50 };
const PHOTO = { w: 90, h: 110 };
const LABEL_W = 165;
const PAD = 6;
const FONT_SIZE = 9.5;

const COLOR = {
  heading: "#2c3e50",
  headingText: "#ffffff",
  labelBg: "#f2f4f7",
  labelText: "#333333",
  value: "#111111",
  border: "#d0d5dd",
  rule: "#999999",
  muted: "#888888",
};

export const isEmpty = (value) =>
  value === null ||
  value === undefined ||
  (typeof value === "string" && value.trim() === "");

/**
 * Load an S3-stored image and return a pdfkit-embeddable buffer (PNG), or null
 * if it is absent/unreadable. Uploads are WebP, which pdfkit cannot embed, so
 * we normalize to PNG via sharp; if sharp is unavailable we return the raw
 * bytes (pdfkit still handles JPEG/PNG originals).
 */
export const loadImageBuffer = async (imgPath) => {
  const key = normalizeKey(imgPath);
  if (!key) return null;
  try {
    const stream = await getReadStream(key);
    if (!stream) return null;
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const raw = Buffer.concat(chunks);

    const sharp = await getSharp();
    if (sharp) {
      try {
        return await sharp(raw).png().toBuffer();
      } catch {
        /* not a decodable image — fall back to the raw bytes */
      }
    }
    return raw;
  } catch {
    return null;
  }
};

const contentBottom = (doc) => doc.page.height - doc.page.margins.bottom;

const ensureSpace = (doc, needed) => {
  if (doc.y + needed > contentBottom(doc)) {
    doc.addPage();
    doc.y = doc.page.margins.top;
  }
};

/**
 * Title + subtitle on the left, boxed photo on the right. Leaves the cursor
 * below the taller of the two, followed by a horizontal rule.
 */
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
    } catch {
      /* unsupported image — box stays empty */
    }
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

/**
 * Render a titled section as a bordered table. `rows` is a list of
 * [label, value] pairs; empty-valued rows are dropped and the whole section is
 * skipped when nothing remains — so only fields that exist are shown.
 */
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
