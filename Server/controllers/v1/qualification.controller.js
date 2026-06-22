import Qualification from "../../models/Qualification.js";

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
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user?.id,
      updatedBy: req.user?.id,
    });
    await doc.save();
    return res
      .status(201)
      .json({ isOk: true, message: "Qualification created", data: doc });
  } catch (error) {
    return res.status(500).json({ isOk: false, message: error.message });
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
    } = req.body;

    const filter = {};
    if (isActive !== undefined && isActive !== "")
      filter.isActive = isActive === true || isActive === "true";
    if (match) filter.name = { $regex: match, $options: "i" };

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
    return res.status(500).json({ isOk: false, message: error.message });
  }
};


export const listPublicQualifications = async (_req, res) => {
  try {
    const docs = await Qualification.find({ isActive: true })
      .sort({ name: 1 })
      .select("name isActive")
      .lean();
    return res.status(200).json({ isOk: true, data: docs });
  } catch (error) {
    return res.status(500).json({ isOk: false, message: error.message });
  }
};

export const getAllQualifications = async (req, res) => {
  try {
    const filter = {};
    if (req.query.isActive !== undefined)
      filter.isActive = req.query.isActive === "true";
    const docs = await Qualification.find(filter).sort({ name: 1 });
    return res.status(200).json({ isOk: true, data: docs });
  } catch (error) {
    return res.status(500).json({ isOk: false, message: error.message });
  }
};

export const getQualificationById = async (req, res) => {
  try {
    const doc = await Qualification.findById(req.params.id);
    if (!doc)
      return res.status(404).json({ isOk: false, message: "Not found" });
    return res.status(200).json({ isOk: true, data: doc });
  } catch (error) {
    return res.status(500).json({ isOk: false, message: error.message });
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
      { name: name.trim(), isActive, updatedBy: req.user?.id },
      { new: true, runValidators: true },
    );
    if (!doc)
      return res.status(404).json({ isOk: false, message: "Not found" });
    return res
      .status(200)
      .json({ isOk: true, message: "Qualification updated", data: doc });
  } catch (error) {
    return res.status(500).json({ isOk: false, message: error.message });
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
    return res.status(500).json({ isOk: false, message: error.message });
  }
};
