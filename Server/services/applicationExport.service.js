import path from "path";
import { PassThrough } from "stream";
import { ZipArchive } from "archiver";
import { generateApplicationPdf } from "./applicationPdf.service.js";
import { getReadStream, normalizeKey } from "./storage.service.js";

const UNSAFE_CHARS = /[<>:"/\\|?*\x00-\x1f]/g;

export const sanitizeFolderName = (ref) =>
  String(ref || "application")
    .replace(UNSAFE_CHARS, "_")
    .slice(0, 120);

const sanitizeFileName = (label) =>
  String(label || "document")
    .replace(UNSAFE_CHARS, "_")
    .replace(/\s+/g, "-")
    .slice(0, 120);

/**
 * Read a stored object fully into a buffer; returns null if missing or
 * unreadable.
 *
 * The caller is already streaming the ZIP to the client, so headers are long
 * since sent and there is no way to turn a failure here into an error
 * response — throwing would truncate the download and look like success. One
 * unreadable document must therefore cost that document, not the whole export.
 * It is logged so a missing file is still traceable afterwards.
 */
const readFileBuffer = async (filePath) => {
  try {
    const stream = await getReadStream(filePath);
    if (!stream) return null;
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
  } catch (err) {
    console.error(
      `[export] unreadable document skipped: ${filePath} — ${err.message}`,
    );
    return null;
  }
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

const csvCell = (value) => {
  const str = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

const FEE_STATUS_LABEL = {
  paid: "PAID",
  pending: "PENDING",
  failed: "FAILED",
  unpaid: "UNPAID",
  not_applicable: "NO FEE",
};

const SUMMARY_HEADER = [
  "App Ref No",
  "Reg ID",
  "Candidate Name",
  "Advertisement No",
  "Post Title",
  "Application Status",
  "Fee Status",
  "Fee Amount",
  "Fee Paid At",
  "Payment Attempts",
  "Payment ID",
  "Submitted At",
  "Documents Attached",
  "Documents Missing",
  "Missing Documents",
];

/**
 * One row per application, so the ZIP carries a readable index rather than
 * only folders. This is the only place in the export where fee state and
 * missing paperwork can be read across the whole batch at a glance.
 *
 * Takes the per-application outcomes recorded while the archive was built, not
 * the raw input: what is missing is only known once each file has been tried.
 *
 * Written with a UTF-8 BOM: Excel otherwise reads Gujarati names as mojibake.
 */
const buildSummaryCsv = (results) => {
  const rows = results.map(({ item, attached, missing }) => {
    const app = item.application || {};
    const fee = item.fee || {};
    return [
      app.application_ref_no,
      app.registration_id,
      item.candidate?.name || "",
      app.advt_no,
      item.advertisement?.post_title?.en || "",
      app.status,
      FEE_STATUS_LABEL[fee.status] || "UNKNOWN",
      fee.status === "not_applicable" ? "" : (fee.amount ?? ""),
      fee.paid_at ? new Date(fee.paid_at).toISOString() : "",
      fee.attempts ?? 0,
      fee.payment_id || "",
      app.submitted_at ? new Date(app.submitted_at).toISOString() : "",
      attached,
      missing.length,
      missing.join("; "),
    ];
  });
  const csv = [SUMMARY_HEADER, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
  return Buffer.from(`﻿${csv}`, "utf8");
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
 * containing application.pdf and all uploaded documents, alongside a summary.csv
 * index of the whole batch.
 *
 * Nothing in the per-application work is allowed to abort the archive: the
 * response is already streaming, so a throw truncates the download and still
 * looks like a successful export to the browser. Whatever could not be added
 * is recorded against that application in summary.csv instead, so the gap is
 * visible to whoever opens the ZIP rather than only in the server log.
 */
export const streamApplicationsZip = async (items, res) => {
  const archive = new ZipArchive({ zlib: { level: 6 } });
  const archiveDone = new Promise((resolve, reject) => {
    archive.on("error", reject);
    archive.on("end", resolve);
  });

  archive.pipe(res);

  const results = [];

  for (const item of items) {
    const ref = item.application?.application_ref_no;
    const folder = sanitizeFolderName(ref);
    const used = new Set();
    const missing = [];
    let attached = 0;

    // Add one file, recording whether it made it in.
    const addFile = (buf, label, sourcePath) => {
      if (!buf) {
        missing.push(label);
        return;
      }
      const key = normalizeKey(sourcePath) || "";
      const ext = path.extname(key) || ".pdf";
      const entry = uniqueEntryName(folder, sanitizeFileName(label), ext, used);
      archive.append(buf, { name: entry });
      attached += 1;
    };

    try {
      const pdfBuffer = await pdfToBuffer(item);
      const pdfName = `${folder}/application.pdf`;
      used.add(pdfName);
      archive.append(pdfBuffer, { name: pdfName });
      attached += 1;
    } catch (err) {
      // A single unrenderable record must not cost the whole batch.
      console.error(
        `[export] application.pdf could not be generated for ${ref} — ${err.message}`,
      );
      missing.push("application.pdf");
    }

    for (const doc of item.application?.documents || []) {
      addFile(await readFileBuffer(doc.file_path), doc.label, doc.file_path);
    }

    for (const doc of candidateDocumentEntries(item.candidate)) {
      addFile(await readFileBuffer(doc.path), doc.label, doc.path);
    }

    results.push({ item, attached, missing });
  }

  // Last, because the misses are only known once every file has been tried.
  // Position in the archive doesn't affect where it lands when unzipped.
  archive.append(buildSummaryCsv(results), { name: "summary.csv" });

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
