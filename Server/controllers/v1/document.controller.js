import {
  normalizeKey,
  getReadStream,
  getSignedDownloadUrl,
  generateAccessToken,
  verifyAccessToken,
} from "../../services/storage.service.js";
import Candidate from "../../models/Candidate.js";
import Application from "../../models/Application.js";

const canAccessKey = async (req, key) => {
  const user = req.session?.user;
  if (!user) return false;

  if (["ADMIN", "EMPLOYEE", "DEPT_ADMIN"].includes(user.role)) return true;

  if (user.role === "CANDIDATE") {
    const regId = user.registration_id;
    const candidate = await Candidate.findOne({ registration_id: regId })
      .select("photo_path signature_path caste_cert_path udid_cert_path")
      .lean();
    const candidateKeys = [
      candidate?.photo_path,
      candidate?.signature_path,
      candidate?.caste_cert_path,
      candidate?.udid_cert_path,
    ].map(normalizeKey);

    if (candidateKeys.includes(key)) return true;

    const apps = await Application.find({ registration_id: regId }).select("documents").lean();
    const docKeys = apps.flatMap((a) => (a.documents || []).map((d) => normalizeKey(d.file_path)));
    if (docKeys.includes(key)) return true;
  }

  return false;
};

export const downloadDocument = async (req, res) => {
  try {
    const key = normalizeKey(req.query.key);
    if (!key) return res.status(400).json({ isOk: false, message: "key is required" });

    if (!(await canAccessKey(req, key)))
      return res.status(403).json({ isOk: false, message: "Access denied" });

    const stream = await getReadStream(key);
    if (!stream) return res.status(404).json({ isOk: false, message: "File not found" });

    const ext = key.split(".").pop()?.toLowerCase();
    const types = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
    res.setHeader("Content-Type", types[ext] || "application/octet-stream");
    stream.pipe(res);
  } catch (error) {
    return res.status(500).json({ isOk: false, message: error.message });
  }
};

export const getDocumentSignedUrl = async (req, res) => {
  try {
    const key = normalizeKey(req.query.key);
    if (!key) return res.status(400).json({ isOk: false, message: "key is required" });

    if (!(await canAccessKey(req, key)))
      return res.status(403).json({ isOk: false, message: "Access denied" });

    const signed = await getSignedDownloadUrl(key);
    if (!signed) {
      return res.status(404).json({ isOk: false, message: "File not found" });
    }
    return res.status(200).json({ isOk: true, data: { url: signed } });
  } catch (error) {
    return res.status(500).json({ isOk: false, message: error.message });
  }
};

export const downloadByToken = async (req, res) => {
  try {
    const data = verifyAccessToken(req.params.token);
    if (!data) return res.status(401).json({ isOk: false, message: "Invalid or expired token" });

    const stream = await getReadStream(data.key);
    if (!stream) return res.status(404).json({ isOk: false, message: "File not found" });

    stream.pipe(res);
  } catch (error) {
    return res.status(500).json({ isOk: false, message: error.message });
  }
};
