// Rules for the candidate photo and signature: file type and file size only.
// The portal never resizes or crops these images. The server checks the same
// rules (Server/config/portal.config.js — keep in step).
export const PHOTO_SPEC = {
  minBytes: 10 * 1024, maxBytes: 250 * 1024,
  boxWidth: 105, boxHeight: 135,           // on-screen frame (passport shape)
  hint: "JPG/PNG · 10–250 KB · recent passport-size colour photo · white background · face clearly visible",
  example: "350 × 450 px",
  shapeEn: "Passport size (portrait)", shapeGu: "પાસપોર્ટ સાઇઝ (ઊભો)",
  noteEn: "Recent colour photo, white background, face clearly visible",
  noteGu: "તાજેતરનો રંગીન ફોટો, સફેદ પૃષ્ઠભૂમિ, ચહેરો સ્પષ્ટ દેખાવો જોઈએ",
};
export const SIGNATURE_SPEC = {
  minBytes: 5 * 1024, maxBytes: 150 * 1024,
  boxWidth: 180, boxHeight: 60,
  hint: "JPG/PNG · 5–150 KB · black/blue ink on white paper",
  example: "450 × 150 px",
  shapeEn: "Landscape (wider than tall)", shapeGu: "આડી",
  noteEn: "Black/blue ink on white paper, cropped close to the signature",
  noteGu: "સફેદ કાગળ પર કાળી/વાદળી શાહીથી સહી, સહીની નજીકથી કાપેલી",
};

const ACCEPTED = ["image/jpeg", "image/jpg", "image/pjpeg", "image/png"];
const ACCEPTED_EXT = /\.(jpe?g|jfif|png)$/i;
const kb = (b) => `${Math.round(b / 1024)} KB`;

// Previews use a data: URL, not blob: — the live site's Content-Security-Policy
// allows images from data: but not blob:, so a blob: preview fails to load.
export const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });

/**
 * Check a picked photo/signature (type and size only) without changing it.
 * Returns { previewUrl } of the original file, or throws an Error whose message
 * tells the candidate exactly what to fix.
 */
export async function checkCandidateImage(file, spec, label = "Image") {
  if (!file) throw new Error("Please select a file.");
  // Some systems leave the type blank; fall back to the file name.
  const typeOk = ACCEPTED.includes(file.type) || (!file.type && ACCEPTED_EXT.test(file.name || ""));
  if (!typeOk) throw new Error(`${label} must be a JPG or PNG image.`);
  if (file.size < spec.minBytes || file.size > spec.maxBytes)
    throw new Error(`${label} file size must be between ${kb(spec.minBytes)} and ${kb(spec.maxBytes)} — yours is ${kb(file.size)}. Please reduce the size and upload again.`);

  let previewUrl = null;
  try {
    previewUrl = await fileToDataUrl(file);
  } catch {
    throw new Error(`This ${label.toLowerCase()} could not be opened. Please choose the file again.`);
  }
  return { previewUrl };
}

export const kbRange = (spec) => `${Math.round(spec.minBytes / 1024)}–${Math.round(spec.maxBytes / 1024)} KB`;
