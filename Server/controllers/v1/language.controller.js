import Language from "../../models/Language.js";

export const createLanguage = async (req, res) => {
  try {
    const { name, order, isActive } = req.body;
    if (!name?.trim())
      return res.status(400).json({ isOk: false, message: "Name is required" });

    const existing = await Language.findOne({ name: name.trim() });
    if (existing)
      return res
        .status(400)
        .json({ isOk: false, message: "Language already exists" });

    const doc = new Language({
      name: name.trim(),
      order: order !== undefined ? order : 0,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user?.id,
      updatedBy: req.user?.id,
    });
    await doc.save();
    return res
      .status(201)
      .json({ isOk: true, message: "Language created", data: doc });
  } catch (error) {
    return res.status(500).json({ isOk: false, message: error.message });
  }
};

export const searchLanguages = async (req, res) => {
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

    const sort = { [sorton || "order"]: sortdir === "desc" ? -1 : 1 };

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

    const result = await Language.aggregate(pipeline);
    return res.status(200).json({ isOk: true, data: result });
  } catch (error) {
    return res.status(500).json({ isOk: false, message: error.message });
  }
};

export const listPublicLanguages = async (_req, res) => {
  try {
    const docs = await Language.find({ isActive: true })
      .sort({ order: 1 })
      .select("name isActive order")
      .lean();
    return res.status(200).json({ isOk: true, data: docs });
  } catch (error) {
    return res.status(500).json({ isOk: false, message: error.message });
  }
};

export const getAllLanguages = async (req, res) => {
  try {
    const filter = {};
    if (req.query.isActive !== undefined)
      filter.isActive = req.query.isActive === "true";
    const docs = await Language.find(filter).sort({ order: 1 });
    return res.status(200).json({ isOk: true, data: docs });
  } catch (error) {
    return res.status(500).json({ isOk: false, message: error.message });
  }
};

export const getLanguageById = async (req, res) => {
  try {
    const doc = await Language.findById(req.params.id);
    if (!doc)
      return res.status(404).json({ isOk: false, message: "Not found" });
    return res.status(200).json({ isOk: true, data: doc });
  } catch (error) {
    return res.status(500).json({ isOk: false, message: error.message });
  }
};

export const updateLanguage = async (req, res) => {
  try {
    const { name, order, isActive } = req.body;
    if (!name?.trim())
      return res.status(400).json({ isOk: false, message: "Name is required" });

    const conflict = await Language.findOne({
      name: name.trim(),
      _id: { $ne: req.params.id },
    });
    if (conflict)
      return res
        .status(400)
        .json({ isOk: false, message: "Language already exists" });

    const doc = await Language.findByIdAndUpdate(
      req.params.id,
      { name: name.trim(), order, isActive, updatedBy: req.user?.id },
      { new: true, runValidators: true },
    );
    if (!doc)
      return res.status(404).json({ isOk: false, message: "Not found" });
    return res
      .status(200)
      .json({ isOk: true, message: "Language updated", data: doc });
  } catch (error) {
    return res.status(500).json({ isOk: false, message: error.message });
  }
};

export const deleteLanguage = async (req, res) => {
  try {
    const doc = await Language.findByIdAndDelete(req.params.id);
    if (!doc)
      return res.status(404).json({ isOk: false, message: "Not found" });
    return res
      .status(200)
      .json({ isOk: true, message: "Language deleted" });
  } catch (error) {
    return res.status(500).json({ isOk: false, message: error.message });
  }
};
