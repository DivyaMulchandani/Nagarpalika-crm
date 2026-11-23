// Rules for the candidate photo and signature. The portal never resizes or
// crops these images: the candidate prepares the file to these rules, and a
// file outside them is refused with a message saying what to fix. The server
// checks the same rules (Server/config/portal.config.js — keep in step).
// ratio = width / height.
export const PHOTO_SPEC = {
  minBytes: 10 * 1024, maxBytes: 250 * 1024,
  minWidth: 200, maxWidth: 600,
  minHeight: 250, maxHeight: 800,
  minRatio: 0.65, maxRatio: 0.9,
  boxWidth: 105, boxHeight: 135,           // on-screen frame (passport shape)
  hint: "Passport-size, portrait (e.g. 350 × 450 px) · 10–250 KB · JPG/PNG · white background · face clearly visible",
  example: "350 × 450 px",
  shapeEn: "Portrait (passport size)", shapeGu: "ઊભો (પાસપોર્ટ સાઇઝ)",
  noteEn: "Recent colour photo, white background, face clearly visible",
  noteGu: "તાજેતરનો રંગીન ફોટો, સફેદ પૃષ્ઠભૂમિ, ચહેરો સ્પષ્ટ દેખાવો જોઈએ",
};
export const SIGNATURE_SPEC = {
  minBytes: 5 * 1024, maxBytes: 150 * 1024,
  minWidth: 200, maxWidth: 800,
  minHeight: 60, maxHeight: 300,
  minRatio: 2, maxRatio: 5,
  boxWidth: 180, boxHeight: 60,
  hint: "Landscape, about 3 : 1 (e.g. 450 × 150 px) · 5–150 KB · JPG/PNG · black/blue ink on white paper",
  example: "450 × 150 px",
  shapeEn: "Landscape, about 3 : 1", shapeGu: "આડી, આશરે 3 : 1",
  noteEn: "Black/blue ink on white paper, cropped close to the signature",
  noteGu: "સફેદ કાગળ પર કાળી/વાદળી શાહીથી સહી, સહીની નજીકથી કાપેલી",
};

const ACCEPTED = ["image/jpeg", "image/jpg", "image/png"];
const kb = (b) => `${Math.round(b / 1024)} KB`;

const readSize = (url) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    // naturalWidth/Height already follow the phone's EXIF rotation.
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("bad image"));
    img.src = url;
  });

/**
 * Check a picked photo/signature against the rules without changing it.
 * Returns { previewUrl } of the original file, or throws an Error whose message
 * tells the candidate exactly what to fix.
 */
export async function checkCandidateImage(file, spec, label = "Image") {
  if (!file) throw new Error("Please select a file.");
  if (!ACCEPTED.includes(file.type)) throw new Error(`${label} must be a JPG or PNG image.`);
  if (file.size < spec.minBytes || file.size > spec.maxBytes)
    throw new Error(`${label} file size must be between ${kb(spec.minBytes)} and ${kb(spec.maxBytes)} — yours is ${kb(file.size)}. Please resize it and upload again.`);

  const previewUrl = URL.createObjectURL(file);
  let size;
  try {
    size = await readSize(previewUrl);
  } catch {
    URL.revokeObjectURL(previewUrl);
    throw new Error(`This ${label.toLowerCase()} could not be read. Please choose a valid JPG or PNG.`);
  }
  const { width, height } = size;
  const ratio = width / height;
  if (
    width < spec.minWidth || width > spec.maxWidth ||
    height < spec.minHeight || height > spec.maxHeight ||
    ratio < spec.minRatio || ratio > spec.maxRatio
  ) {
    URL.revokeObjectURL(previewUrl);
    throw new Error(
      `${label} must be ${spec.minWidth}–${spec.maxWidth} px wide and ${spec.minHeight}–${spec.maxHeight} px high ` +
      `(${spec === PHOTO_SPEC ? "portrait, passport shape" : "landscape, about 3 : 1"}). ` +
      `Yours is ${width} × ${height} px. Please resize it and upload again.`,
    );
  }
  return { previewUrl };
}

export const kbRange = (spec) => `${Math.round(spec.minBytes / 1024)}–${Math.round(spec.maxBytes / 1024)} KB`;
