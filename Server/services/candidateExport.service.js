import path from "path";
import { PassThrough } from "stream";
import { ZipArchive } from "archiver";
import { generateCandidatePdf } from "./candidatePdf.service.js";
import { getReadStream, normalizeKey } from "./storage.service.js";

const UNSAFE_CHARS = /[<>:"/\\|?*\x00-\x1f]/g;

const sanitize = (value, fallback) => {
  const cleaned = String(value ?? "")
    .replace(UNSAFE_CHARS, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return cleaned || fallback;
};

/** Read an S3 object fully into a buffer; returns null if missing/unreadable. */
const readFileBuffer = async (filePath) => {
  try {
    const stream = await getReadStream(filePath);
    if (!stream) return null;
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
  } catch {
    return null;
  }
};

const pdfToBuffer = async (candidate) => {
  const dest = new PassThrough();
  const chunks = [];
  dest.on("data", (chunk) => chunks.push(chunk));
  await generateCandidatePdf(candidate, dest);
  return Buffer.concat(chunks);
};

const candidateFileEntries = (candidate) =>
  [
    { label: "photo", path: candidate.photo_path },
    { label: "signature", path: candidate.signature_path },
    { label: "caste-certificate", path: candidate.caste_cert_path },
    { label: "udid-certificate", path: candidate.udid_cert_path },
  ].filter((f) => f.path);

/** Reserve a collision-free name within `used`, suffixing " (2)", " (3)"… */
const reserveUnique = (base, used) => {
  let name = base;
  let n = 2;
  while (used.has(name)) {
    name = `${base} (${n})`;
    n += 1;
  }
  used.add(name);
  return name;
};

/**
 * Stream a ZIP archive of candidates to `res`. Each candidate becomes a folder
 * named "<Name>-<RegistrationId>" containing candidate-details.pdf plus every
 * uploaded file (photo, signature, caste & UDID certificates). Files that are
 * missing in S3 are skipped rather than failing the whole archive.
 */
export const streamCandidatesZip = async (candidates, res) => {
  const archive = new ZipArchive({ zlib: { level: 6 } });
  const archiveDone = new Promise((resolve, reject) => {
    archive.on("error", reject);
    archive.on("end", resolve);
  });

  archive.pipe(res);

  const usedFolders = new Set();

  for (const candidate of candidates) {
    const namePart = sanitize(candidate.name, "candidate");
    const idPart = sanitize(candidate.registration_id, "");
    const base = idPart ? `${namePart}-${idPart}` : namePart;
    const folder = reserveUnique(base, usedFolders);

    const pdfBuffer = await pdfToBuffer(candidate);
    archive.append(pdfBuffer, { name: `${folder}/candidate-details.pdf` });

    const usedFiles = new Set(["candidate-details.pdf"]);
    for (const file of candidateFileEntries(candidate)) {
      const buf = await readFileBuffer(file.path);
      if (!buf) continue;
      const ext = path.extname(normalizeKey(file.path) || "");
      const entry = reserveUnique(`${file.label}${ext}`, usedFiles);
      archive.append(buf, { name: `${folder}/${entry}` });
    }
  }

  await archive.finalize();
  await archiveDone;
};

export const buildCandidatesZipFilename = (count) => {
  const stamp = new Date().toISOString().slice(0, 10);
  return `candidates-${stamp}-${count || "all"}.zip`;
};
