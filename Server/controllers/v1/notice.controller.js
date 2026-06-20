import crypto from "crypto";
import Notice from "../../models/Notice.js";
import {
  getReadStream,
  uploadBuffer,
  deleteFile,
  normalizeKey,
  attachFileUrls,
  resolveFileUrl,
} from "../../services/storage.service.js";

export const createNotice = async (req, res) => {
  try {
    const {
      title,
      body,
      pdf_path,
      type,
      publish_date,
      expiry_date,
      status,
      is_important_instruction,
    } = req.body;
    const notice = new Notice({
      title,
      body,
      pdf_path,
      type,
      publish_date,
      expiry_date,
      status,
      is_important_instruction,
      createdBy: req.user.id,
    });
    await notice.save();
    return res.status(201).json({
      isOk: true,
      status: 201,
      message: "Notice created",
      data: notice,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

const MARQUEE_NOTICE_PROJECTION =
  "title body publish_date pdf_path slug type status";

export const listNotices = async (req, res) => {
  try {
    const isAuthenticated = !!req.session?.user;
    const filter = {};

    filter.status =
      req.query.status || (isAuthenticated ? undefined : "published");
    if (!filter.status) delete filter.status;

    if (req.query.type) filter.type = req.query.type;
    if (req.query.is_important_instruction !== undefined) {
      filter.is_important_instruction =
        req.query.is_important_instruction === "true";
    }
    filter.is_deleted = { $ne: true };

    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const skip = (page - 1) * limit;

    const projection = isAuthenticated
      ? undefined
      : MARQUEE_NOTICE_PROJECTION;

    const [total, raw] = await Promise.all([
      Notice.countDocuments(filter),
      Notice.find(filter)
        .select(projection)
        .sort({ publish_date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const data = await Promise.all(raw.map((item) => attachFileUrls(item, ["pdf_path"])));

    return res.status(200).json({
      isOk: true,
      status: 200,
      data,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

export const getNoticePdf = async (req, res) => {
  try {
    const notice = await Notice.findOne({
      _id: req.params.id,
      is_deleted: { $ne: true },
    }).select("pdf_path status");
    if (!notice)
      return res
        .status(404)
        .json({ isOk: false, status: 404, message: "Not found" });

    if (!normalizeKey(notice.pdf_path))
      return res
        .status(404)
        .json({ isOk: false, status: 404, message: "No PDF available" });

    const stream = await getReadStream(notice.pdf_path);
    if (!stream)
      return res
        .status(404)
        .json({ isOk: false, status: 404, message: "File not found" });

    res.setHeader("Content-Type", "application/pdf");
    return stream.pipe(res);
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

export const getNoticeById = async (req, res) => {
  try {
    const notice = await Notice.findOne({
      _id: req.params.id,
      is_deleted: { $ne: true },
    });
    if (!notice)
      return res
        .status(404)
        .json({ isOk: false, status: 404, message: "Not found" });
    const data = await attachFileUrls(notice, ["pdf_path"]);
    return res.status(200).json({ isOk: true, status: 200, data });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

export const patchNotice = async (req, res) => {
  try {
    const notice = await Notice.findOne({
      _id: req.params.id,
      is_deleted: { $ne: true },
    });
    if (!notice)
      return res
        .status(404)
        .json({ isOk: false, status: 404, message: "Not found" });

    const ALLOWED = [
      "title",
      "body",
      "type",
      "publish_date",
      "expiry_date",
      "is_important_instruction",
    ];
    for (const key of ALLOWED) {
      if (req.body[key] !== undefined) notice[key] = req.body[key];
    }
    notice.updatedBy = req.user.id;
    await notice.save();
    return res
      .status(200)
      .json({ isOk: true, status: 200, message: "Updated", data: notice });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

export const deleteNotice = async (req, res) => {
  try {
    const notice = await Notice.findOne({
      _id: req.params.id,
      is_deleted: { $ne: true },
    });
    if (!notice)
      return res
        .status(404)
        .json({ isOk: false, status: 404, message: "Not found" });
    notice.is_deleted = true;
    notice.updatedBy = req.user.id;
    await notice.save();
    return res
      .status(200)
      .json({ isOk: true, status: 200, message: "Deleted" });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

export const searchNotices = async (req, res) => {
  try {
    const {
      skip = 0,
      per_page = 10,
      match,
      type,
      status,
      sorton,
      sortdir,
    } = req.body;

    const matchCond = { is_deleted: { $ne: true } };
    if (type) matchCond.type = type;
    if (status) matchCond.status = status;

    const pipeline = [];
    if (match) {
      pipeline.push({ $match: { title: { $regex: match, $options: "i" } } });
    }
    pipeline.push({ $match: matchCond });
    pipeline.push({
      $sort: { [sorton || "createdAt"]: sortdir === "asc" ? 1 : -1 },
    });
    pipeline.push({
      $facet: {
        stage1: [{ $group: { _id: null, count: { $sum: 1 } } }],
        stage2: [{ $skip: skip }, { $limit: per_page }],
      },
    });
    pipeline.push({
      $unwind: { path: "$stage1", preserveNullAndEmptyArrays: true },
    });
    pipeline.push({
      $project: { count: { $ifNull: ["$stage1.count", 0] }, data: "$stage2" },
    });

    const result = await Notice.aggregate(pipeline);
    return res.status(200).json({ isOk: true, status: 200, data: result });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

export const patchNoticeStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const VALID = ["draft", "published", "unpublished"];
    if (!VALID.includes(status))
      return res
        .status(422)
        .json({
          isOk: false,
          status: 422,
          message: "status must be draft, published, or unpublished",
        });

    const notice = await Notice.findOne({
      _id: req.params.id,
      is_deleted: { $ne: true },
    });
    if (!notice)
      return res
        .status(404)
        .json({ isOk: false, status: 404, message: "Not found" });

    notice.status = status;
    if (status === "published" && !notice.publish_date)
      notice.publish_date = new Date();
    notice.updatedBy = req.user.id;
    await notice.save();
    return res
      .status(200)
      .json({
        isOk: true,
        status: 200,
        message: `Status updated to ${status}`,
        data: { status: notice.status },
      });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

export const uploadNoticePdf = async (req, res) => {
  try {
    const notice = await Notice.findOne({
      _id: req.params.id,
      is_deleted: { $ne: true },
    });
    if (!notice)
      return res
        .status(404)
        .json({ isOk: false, status: 404, message: "Not found" });
    if (!req.file)
      return res
        .status(422)
        .json({ isOk: false, status: 422, message: "PDF file required" });

    if (notice.pdf_path) await deleteFile(notice.pdf_path);

    const filename = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.pdf`;
    const stored = await uploadBuffer({
      module: "notices",
      buffer: req.file.buffer,
      filename,
      contentType: "application/pdf",
    });
    notice.pdf_path = stored.key;
    notice.updatedBy = req.user.id;
    await notice.save();
    const pdf_url = await resolveFileUrl(notice.pdf_path);
    return res
      .status(200)
      .json({
        isOk: true,
        status: 200,
        message: "PDF uploaded",
        data: { pdf_path: notice.pdf_path, pdf_url },
      });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};
