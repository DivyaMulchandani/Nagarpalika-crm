import Qualification from "../../models/Qualification.js";
import { escapeRegex } from "../../utils/escapeRegex.js";

const TYPES = ["education", "certificate", "document"];
// type + level from the form; level only means something for education.
const typeAndLevel = (body) => {
  const type = TYPES.includes(body.type) ? body.type : "education";
  const n = Number(body.level);
  const level =
    type === "education" && body.level !== "" && body.level !== null && Number.isFinite(n) && n >= 0 && n <= 99
      ? Math.floor(n)
      : undefined;
  return { type, level };
};

export const createQualification = async (req, res) => {
  try {
    const { name, isActive } = req.body;
    if (!name?.trim())
      return res.status(400).json({ isOk: false, message: "Name is required" });

    const existing = await Qualification.findOne({ name: name.trim() });
    if (existing)
      return res
        .status(400)
        .json({ isOk: false, message: "Qualification already exists" });

    const doc = new Qualification({
      name: name.trim(),
      ...typeAndLevel(req.body),
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user?.id,
      updatedBy: req.user?.id,
    });
    await doc.save();
    return res
      .status(201)
      .json({ isOk: true, message: "Qualification created", data: doc });
  } catch (error) {
    console.error("[qualification] createQualification error:", error.message);
    return res.status(500).json({ isOk: false, message: "An unexpected error occurred" });
  }
};

export const searchQualifications = async (req, res) => {
  try {
    const {
      skip = 0,
      per_page = 100,
      match,
      isActive,
      sorton,
      sortdir,
      type,
    } = req.body;

    const filter = {};
    if (TYPES.includes(type)) filter.type = type;
    if (isActive !== undefined && isActive !== "")
      filter.isActive = isActive === true || isActive === "true";
    if (match) filter.name = { $regex: escapeRegex(match), $options: "i" };

    const sort = { [sorton || "name"]: sortdir === "desc" ? -1 : 1 };

    const pipeline = [
      { $match: filter },
      { $sort: sort },
      {
        $facet: {
          stage1: [{ $group: { _id: null, count: { $sum: 1 } } }],
          stage2: [{ $skip: Number(skip) }, { $limit: Number(per_page) }],
        },
      },
      { $unwind: { path: "$stage1", preserveNullAndEmptyArrays: true } },
      {
        $project: { count: { $ifNull: ["$stage1.count", 0] }, data: "$stage2" },
      },
    ];

    const result = await Qualification.aggregate(pipeline);
    return res.status(200).json({ isOk: true, data: result });
  } catch (error) {
    console.error("[qualification] searchQualifications error:", error.message);
    return res.status(500).json({ isOk: false, message: "An unexpected error occurred" });
  }
};


// OTR and profile "Highest Qualification": education entries only, lowest
// level first. Entries saved before types existed count as education.
export const listPublicQualifications = async (req, res) => {
  try {
    const type = TYPES.includes(req.query.type) ? req.query.type : "education";
    const typeFilter = type === "education" ? { $in: ["education", null] } : type;
    const docs = await Qualification.find({ isActive: true, type: typeFilter })
      .select("name level type")
      .lean();
    docs.sort((a, b) => (a.level ?? 999) - (b.level ?? 999) || a.name.localeCompare(b.name));
    return res.status(200).json({ isOk: true, data: docs });
  } catch (error) {
    console.error("[qualification] listPublicQualifications error:", error.message);
    return res.status(500).json({ isOk: false, message: "An unexpected error occurred" });
  }
};

export const getAllQualifications = async (req, res) => {
  try {
    const filter = {};
    if (req.query.isActive !== undefined)
      filter.isActive = req.query.isActive === "true";
    const docs = await Qualification.find(filter).sort({ type: 1, level: 1, name: 1 });
    return res.status(200).json({ isOk: true, data: docs });
  } catch (error) {
    console.error("[qualification] getAllQualifications error:", error.message);
    return res.status(500).json({ isOk: false, message: "An unexpected error occurred" });
  }
};

export const getQualificationById = async (req, res) => {
  try {
    const doc = await Qualification.findById(req.params.id);
    if (!doc)
      return res.status(404).json({ isOk: false, message: "Not found" });
    return res.status(200).json({ isOk: true, data: doc });
  } catch (error) {
    console.error("[qualification] getQualificationById error:", error.message);
    return res.status(500).json({ isOk: false, message: "An unexpected error occurred" });
  }
};

export const updateQualification = async (req, res) => {
  try {
    const { name, isActive } = req.body;
    if (!name?.trim())
      return res.status(400).json({ isOk: false, message: "Name is required" });

    const conflict = await Qualification.findOne({
      name: name.trim(),
      _id: { $ne: req.params.id },
    });
    if (conflict)
      return res
        .status(400)
        .json({ isOk: false, message: "Qualification already exists" });

    const doc = await Qualification.findByIdAndUpdate(
      req.params.id,
      (() => {
        const { type, level } = typeAndLevel(req.body);
        const set = { name: name.trim(), isActive, type, updatedBy: req.user?.id };
        // Changing to certificate/document (or clearing the level) removes it.
        return level === undefined ? { $set: set, $unset: { level: 1 } } : { $set: { ...set, level } };
      })(),
      { new: true, runValidators: true },
    );
    if (!doc)
      return res.status(404).json({ isOk: false, message: "Not found" });
    return res
      .status(200)
      .json({ isOk: true, message: "Qualification updated", data: doc });
  } catch (error) {
    console.error("[qualification] updateQualification error:", error.message);
    return res.status(500).json({ isOk: false, message: "An unexpected error occurred" });
  }
};

export const deleteQualification = async (req, res) => {
  try {
    const doc = await Qualification.findByIdAndDelete(req.params.id);
    if (!doc)
      return res.status(404).json({ isOk: false, message: "Not found" });
    return res
      .status(200)
      .json({ isOk: true, message: "Qualification deleted" });
  } catch (error) {
    console.error("[qualification] deleteQualification error:", error.message);
    return res.status(500).json({ isOk: false, message: "An unexpected error occurred" });
  }
};
