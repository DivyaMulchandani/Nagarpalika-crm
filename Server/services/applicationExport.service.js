import path from "path";
import { PassThrough } from "stream";
import archiver from "archiver";
import { generateApplicationPdf } from "./applicationPdf.service.js";
import { getReadStream, normalizeKey } from "./storage.service.js";

const UNSAFE_CHARS = /[<>:"/\\|?*\x00-\x1f]/g;

export const sanitizeFolderName = (ref) =>
  String(ref || "application").replace(UNSAFE_CHARS, "_").slice(0, 120);

const sanitizeFileName = (label) =>
  String(label || "document")
    .replace(UNSAFE_CHARS, "_")
    .replace(/\s+/g, "-")
    .slice(0, 120);

const readFileBuffer = async (filePath) => {
  const stream = await getReadStream(filePath);
  if (!stream) return null;
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
};

const pdfToBuffer = async (data) => {
  const dest = new PassThrough();
  const chunks = [];
  dest.on("data", (chunk) => chunks.push(chunk));
  await generateApplicationPdf(data, dest);
  return Buffer.concat(chunks);
};

const uniqueEntryName = (folder, baseName, ext, used) => {
  let name = `${baseName}${ext}`;
  let n = 2;
  const key = (entry) => `${folder}/${entry}`;
  while (used.has(key(name))) {
    name = `${baseName}-${n}${ext}`;
    n += 1;
  }
  used.add(key(name));
  return `${folder}/${name}`;
};

const candidateDocumentEntries = (candidate) => {
  if (!candidate) return [];
  return [
    { label: "candidate-photo", path: candidate.photo_path },
    { label: "candidate-signature", path: candidate.signature_path },
    { label: "caste-certificate", path: candidate.caste_cert_path },
    { label: "udid-certificate", path: candidate.udid_cert_path },
  ].filter((d) => d.path);
};

/**
 * Stream a ZIP archive to `res`. Each application is a folder named by application_ref_no
 * containing application.pdf and all uploaded documents.
 */
export const streamApplicationsZip = async (items, res) => {
  const archive = archiver("zip", { zlib: { level: 6 } });
  const archiveDone = new Promise((resolve, reject) => {
    archive.on("error", reject);
    archive.on("end", resolve);
  });

  archive.pipe(res);

  for (const item of items) {
          const folder = sanitizeFolderName(item.application?.application_ref_no);
          const used = new Set();

          const pdfBuffer = await pdfToBuffer(item);
          const pdfName = `${folder}/application.pdf`;
          used.add(pdfName);
          archive.append(pdfBuffer, { name: pdfName });

          for (const doc of item.application?.documents || []) {
            const buf = await readFileBuffer(doc.file_path);
            if (!buf) continue;
            const key = normalizeKey(doc.file_path) || "";
            const ext = path.extname(key) || ".pdf";
            const entry = uniqueEntryName(
              folder,
              sanitizeFileName(doc.label),
              ext,
              used,
            );
            archive.append(buf, { name: entry });
          }

          for (const doc of candidateDocumentEntries(item.candidate)) {
            const buf = await readFileBuffer(doc.path);
            if (!buf) continue;
            const key = normalizeKey(doc.path) || "";
            const ext = path.extname(key) || ".pdf";
            const entry = uniqueEntryName(folder, sanitizeFileName(doc.label), ext, used);
            archive.append(buf, { name: entry });
          }
        }

  await archive.finalize();
  await archiveDone;
};

export const buildExportZipFilename = ({ advt_no, count } = {}) => {
  const stamp = new Date().toISOString().slice(0, 10);
  if (advt_no) {
    const safeAdvt = String(advt_no).replace(/\//g, "-");
    return `applications-${safeAdvt}-${stamp}.zip`;
  }
  return `applications-export-${count || "all"}-${stamp}.zip`;
};
