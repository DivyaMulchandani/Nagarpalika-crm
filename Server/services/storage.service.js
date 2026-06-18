import fs from "fs";
import path from "path";
import crypto from "crypto";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const S3_PREFIX = process.env.S3_PREFIX || "";

let s3Client = null;

export const isS3Enabled = () =>
  !!(process.env.S3_BUCKET && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);

const requireS3 = () => {
  if (!isS3Enabled()) {
    throw new Error(
      "S3 storage is required. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and S3_BUCKET in the environment.",
    );
  }
};

const getS3 = () => {
  requireS3();
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.AWS_REGION || "ap-south-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Client;
};

/** Normalize DB path to storage key (no uploads/ prefix) */
export const normalizeKey = (filePath) => {
  if (!filePath) return null;
  return String(filePath).replace(/\\/g, "/").replace(/^uploads\//, "");
};

/** Map multer destination folder to S3 module prefix */
export const moduleFromDestination = (destination = "") => {
  const d = destination.replace(/\\/g, "/");
  if (d.includes("application-docs")) return "application-docs";
  if (d.includes("candidates")) return "candidates";
  if (d.includes("advertisements")) return "advertisements";
  if (d.includes("notices")) return "notices";
  if (d.includes("companyMaster") || d.includes("company-master")) return "company-master";
  if (d.includes("email-template")) return "cms/email-template/signature";
  return d.replace(/^uploads\/?/, "") || "misc";
};

const s3Key = (module, filename) => {
  const parts = [S3_PREFIX, module, filename].filter(Boolean);
  return parts.join("/");
};

export const uploadBuffer = async ({ module, buffer, filename, contentType }) => {
  requireS3();
  const key = s3Key(module, filename);
  const client = getS3();
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType || "application/octet-stream",
    }),
  );
  return { key, storage: "s3" };
};

export const getReadStream = async (filePath) => {
  requireS3();
  const key = normalizeKey(filePath);
  if (!key) return null;

  const client = getS3();
  const res = await client.send(
    new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }),
  );
  return res.Body;
};

export const getSignedDownloadUrl = async (filePath, ttlSeconds = 3600) => {
  requireS3();
  const key = normalizeKey(filePath);
  if (!key) return null;

  const client = getS3();
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }),
    { expiresIn: ttlSeconds },
  );
};

/** Direct public URL when CDN/public bucket base is configured; otherwise presigned S3 URL. */
export const resolveFileUrl = async (filePath, ttlSeconds = 3600) => {
  const key = normalizeKey(filePath);
  if (!key) return null;

  const publicBase = process.env.S3_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (publicBase) {
    const prefix = S3_PREFIX ? `${S3_PREFIX}/` : "";
    return `${publicBase}/${prefix}${key}`.replace(/([^:]\/)\/+/g, "$1");
  }

  return getSignedDownloadUrl(key, ttlSeconds);
};

export const attachFileUrls = async (record, fields, ttlSeconds = 3600) => {
  if (!record) return record;
  const plain = record.toObject ? record.toObject() : { ...record };
  await Promise.all(
    fields.map(async (field) => {
      if (!plain[field]) return;
      const urlField = field.endsWith("_path")
        ? field.replace(/_path$/, "_url")
        : `${field}_url`;
      plain[urlField] = await resolveFileUrl(plain[field], ttlSeconds);
    }),
  );
  return plain;
};

export const attachDocumentListUrls = async (documents, ttlSeconds = 3600) => {
  if (!documents?.length) return documents || [];
  return Promise.all(
    documents.map(async (doc) => ({
      ...(doc.toObject ? doc.toObject() : doc),
      file_url: doc.file_path ? await resolveFileUrl(doc.file_path, ttlSeconds) : null,
    })),
  );
};

export const generateAccessToken = (key, registrationId = null) => {
  const exp = Date.now() + 15 * 60 * 1000;
  const payload = JSON.stringify({ key: normalizeKey(key), exp, registrationId });
  const sig = crypto
    .createHmac("sha256", process.env.SESSION_SECRET || "dev-secret")
    .update(payload)
    .digest("hex");
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
};

export const verifyAccessToken = (token) => {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const lastDot = decoded.lastIndexOf(".");
    const payload = decoded.slice(0, lastDot);
    const sig = decoded.slice(lastDot + 1);
    const expected = crypto
      .createHmac("sha256", process.env.SESSION_SECRET || "dev-secret")
      .update(payload)
      .digest("hex");
    if (sig !== expected) return null;
    const data = JSON.parse(payload);
    if (Date.now() > data.exp) return null;
    return data;
  } catch {
    return null;
  }
};

export const deleteFile = async (filePath) => {
  requireS3();
  const key = normalizeKey(filePath);
  if (!key) return;

  const client = getS3();
  await client.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
};

export const CANDIDATE_FILE_FIELDS = [
  "photo_path",
  "signature_path",
  "caste_cert_path",
  "udid_cert_path",
];
