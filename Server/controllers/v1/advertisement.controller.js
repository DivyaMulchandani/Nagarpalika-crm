import path from "path";
import fs from "fs";
import mongoose from "mongoose";
import Advertisement from "../../models/Advertisement.js";

const UPLOADS_ROOT = path.resolve("uploads");

const safePdfPath = (pdf_path) => {
  if (!pdf_path) return null;
  const resolved = path.resolve(UPLOADS_ROOT, pdf_path);
  if (
    !resolved.startsWith(UPLOADS_ROOT + path.sep) &&
    resolved !== UPLOADS_ROOT
  )
    return null;
  return resolved;
};

export const createAdvertisement = async (req, res) => {
  try {
    const {
      post_title,
      department,
      class: cls,
      pay_scale,
      vacancies,
      age_limit,
      qualification,
      ph_description,
      experience_required,
      application_fee,
      start_date,
      end_date,
      probation_period,
      pdf_path,
      other_conditions,
      note,
      status,
    } = req.body;

    const adv = new Advertisement({
      post_title,
      department,
      class: cls,
      pay_scale,
      vacancies,
      age_limit,
      qualification,
      ph_description,
      experience_required,
      application_fee,
      start_date,
      end_date,
      probation_period,
      pdf_path,
      other_conditions,
      note,
      status,
      createdBy: req.user.id,
    });

    await adv.save();
    return res.status(201).json({
      isOk: true,
      status: 201,
      message: "Advertisement created",
      data: adv,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

export const listAdvertisements = async (req, res) => {
  try {
    const isAuthenticated = !!req.session?.user;
    const filter = {};

    // Default to Published for unauthenticated callers
    filter.status =
      req.query.status || (isAuthenticated ? undefined : "Published");
    if (!filter.status) delete filter.status;

    if (req.query.class) filter.class = req.query.class;
    if (req.query.dept) filter.department = req.query.dept;

    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      Advertisement.countDocuments(filter),
      Advertisement.find(filter)
        .populate("department", "departmentName departmentCode")
        .sort({ end_date: 1 })
        .skip(skip)
        .limit(limit),
    ]);

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

export const getAdvertisementPdf = async (req, res) => {
  try {
    const adv = await Advertisement.findById(req.params.id).select(
      "pdf_path status",
    );
    if (!adv)
      return res
        .status(404)
        .json({ isOk: false, status: 404, message: "Not found" });

    const filePath = safePdfPath(adv.pdf_path);
    if (!filePath)
      return res
        .status(404)
        .json({ isOk: false, status: 404, message: "No PDF available" });
    if (!fs.existsSync(filePath))
      return res
        .status(404)
        .json({ isOk: false, status: 404, message: "File not found" });

    return res.sendFile(filePath);
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

export const getAdvertisementById = async (req, res) => {
  try {
    const { id } = req.params;
    const query = mongoose.Types.ObjectId.isValid(id)
      ? { _id: id }
      : { slug: id };
    const adv = await Advertisement.findOne(query).populate(
      "department",
      "departmentName departmentCode",
    );
    if (!adv)
      return res
        .status(404)
        .json({ isOk: false, status: 404, message: "Not found" });
    return res.status(200).json({ isOk: true, status: 200, data: adv });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

export const patchAdvertisement = async (req, res) => {
  try {
    const adv = await Advertisement.findById(req.params.id);
    if (!adv)
      return res
        .status(404)
        .json({ isOk: false, status: 404, message: "Not found" });
    if (
      req.scopedDepartmentId &&
      String(adv.department) !== String(req.scopedDepartmentId)
    )
      return res
        .status(403)
        .json({ isOk: false, status: 403, message: "Forbidden" });

    const ALLOWED = [
      "post_title",
      "department",
      "class",
      "pay_scale",
      "vacancies",
      "age_limit",
      "qualification",
      "ph_description",
      "experience_required",
      "application_fee",
      "start_date",
      "end_date",
      "probation_period",
      "other_conditions",
      "note",
    ];
    for (const key of ALLOWED) {
      if (req.body[key] !== undefined) adv[key] = req.body[key];
    }
    adv.markModified("vacancies");
    adv.updatedBy = req.user.id;
    await adv.save();
    return res
      .status(200)
      .json({ isOk: true, status: 200, message: "Updated", data: adv });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

export const deleteAdvertisement = async (req, res) => {
  try {
    const adv = await Advertisement.findById(req.params.id);
    if (!adv)
      return res
        .status(404)
        .json({ isOk: false, status: 404, message: "Not found" });
    adv.status = "Archived";
    adv.updatedBy = req.user.id;
    await adv.save();
    return res
      .status(200)
      .json({ isOk: true, status: 200, message: "Archived" });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

export const searchAdvertisements = async (req, res) => {
  try {
    const {
      skip = 0,
      per_page = 10,
      match,
      status,
      sorton,
      sortdir,
    } = req.body;

    const matchCond = {};
    if (status) matchCond.status = status;

    const pipeline = [];
    if (match) {
      pipeline.push({
        $match: {
          $or: [
            { "post_title.en": { $regex: match, $options: "i" } },
            { advt_no: { $regex: match, $options: "i" } },
          ],
        },
      });
    }
    pipeline.push({ $match: matchCond });
    pipeline.push({
      $lookup: {
        from: "departments",
        localField: "department",
        foreignField: "_id",
        as: "department",
      },
    });
    pipeline.push({
      $unwind: { path: "$department", preserveNullAndEmptyArrays: true },
    });
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

    const result = await Advertisement.aggregate(pipeline);
    return res.status(200).json({ isOk: true, status: 200, data: result });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

const STATUS_TRANSITIONS = {
  Draft: ["Published"],
  Published: ["Closed"],
  Closed: ["Archived"],
  Archived: ["Published"],
};

export const patchAdvertisementStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const adv = await Advertisement.findById(req.params.id);
    if (!adv)
      return res
        .status(404)
        .json({ isOk: false, status: 404, message: "Not found" });
    if (
      req.scopedDepartmentId &&
      String(adv.department) !== String(req.scopedDepartmentId)
    )
      return res
        .status(403)
        .json({ isOk: false, status: 403, message: "Forbidden" });

    const allowed = STATUS_TRANSITIONS[adv.status] ?? [];
    if (!allowed.includes(status))
      return res.status(422).json({
        isOk: false,
        status: 422,
        message: `Cannot transition from ${adv.status} to ${status}`,
      });

    if (status === "Published") {
      const missing = [];
      if (!adv.post_title?.en?.trim()) missing.push("post_title.en");
      if (!adv.department) missing.push("department");
      if (!adv.class) missing.push("class");
      if (!adv.qualification?.trim()) missing.push("qualification");
      if (!adv.start_date) missing.push("start_date");
      if (!adv.end_date) missing.push("end_date");
      if (!(adv.vacancies?.total > 0)) missing.push("vacancies.total");
      if (missing.length)
        return res.status(422).json({
          isOk: false,
          status: 422,
          message: "Missing required fields before publishing",
          fields: missing,
        });
    }

    adv.status = status;
    adv.updatedBy = req.user.id;
    await adv.save();
    return res.status(200).json({
      isOk: true,
      status: 200,
      message: `Status updated to ${status}`,
      data: { status: adv.status },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

export const uploadAdvertisementPdf = async (req, res) => {
  try {
    const adv = await Advertisement.findById(req.params.id);
    if (!adv)
      return res
        .status(404)
        .json({ isOk: false, status: 404, message: "Not found" });
    if (
      req.scopedDepartmentId &&
      String(adv.department) !== String(req.scopedDepartmentId)
    )
      return res
        .status(403)
        .json({ isOk: false, status: 403, message: "Forbidden" });
    if (!req.file)
      return res
        .status(422)
        .json({ isOk: false, status: 422, message: "PDF file required" });

    if (adv.pdf_path) {
      const oldPath = safePdfPath(adv.pdf_path);
      if (oldPath && fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    adv.pdf_path = path.join("advertisements", req.file.filename);
    adv.updatedBy = req.user.id;
    await adv.save();
    return res.status(200).json({
      isOk: true,
      status: 200,
      message: "PDF uploaded",
      data: { pdf_path: adv.pdf_path },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

export const triggerZipExport = async (req, res) => {
  try {
    const adv = await Advertisement.findById(req.params.id).select(
      "zip_export",
    );
    if (!adv)
      return res
        .status(404)
        .json({ isOk: false, status: 404, message: "Not found" });
    if (adv.zip_export?.status === "processing")
      return res.status(409).json({
        isOk: false,
        status: 409,
        message: "Export already in progress",
      });

    adv.zip_export = {
      status: "processing",
      requested_at: new Date(),
      ready_at: null,
      file_path: null,
      expires_at: null,
    };
    await adv.save();
    return res
      .status(202)
      .json({ isOk: true, status: 202, message: "ZIP export triggered" });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

export const getZipExportStatus = async (req, res) => {
  try {
    const adv = await Advertisement.findById(req.params.id).select(
      "zip_export",
    );
    if (!adv)
      return res
        .status(404)
        .json({ isOk: false, status: 404, message: "Not found" });
    return res.status(200).json({
      isOk: true,
      status: 200,
      data: adv.zip_export ?? { status: "idle" },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

export const downloadZipExport = async (req, res) => {
  try {
    const adv = await Advertisement.findById(req.params.id).select(
      "zip_export advt_no",
    );
    if (!adv)
      return res
        .status(404)
        .json({ isOk: false, status: 404, message: "Not found" });
    const ze = adv.zip_export;
    if (!ze || ze.status !== "ready")
      return res
        .status(404)
        .json({ isOk: false, status: 404, message: "ZIP not ready" });
    if (ze.expires_at && new Date() > ze.expires_at)
      return res
        .status(410)
        .json({ isOk: false, status: 410, message: "ZIP export expired" });
    if (!ze.file_path)
      return res
        .status(404)
        .json({ isOk: false, status: 404, message: "File not found" });

    const filePath = path.resolve(UPLOADS_ROOT, ze.file_path);
    if (!filePath.startsWith(UPLOADS_ROOT + path.sep))
      return res
        .status(400)
        .json({ isOk: false, status: 400, message: "Invalid file path" });
    if (!fs.existsSync(filePath))
      return res
        .status(404)
        .json({ isOk: false, status: 404, message: "File not found" });

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="applications-${(adv.advt_no ?? String(adv._id)).replace(/\//g, "-")}.zip"`,
    );
    return res.sendFile(filePath);
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};
