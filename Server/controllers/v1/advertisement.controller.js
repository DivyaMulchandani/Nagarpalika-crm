import crypto from "crypto";
import Qualification from "../../models/Qualification.js";
import { sanitizeAgeRelaxation } from "../../services/eligibility.service.js";
import mongoose from "mongoose";
import Advertisement from "../../models/Advertisement.js";
import Application from "../../models/Application.js";
import {
  getReadStream,
  uploadBuffer,
  deleteFile,
  normalizeKey,
  attachFileUrls,
  resolveFileUrl,
} from "../../services/storage.service.js";
import { escapeRegex } from "../../utils/escapeRegex.js";
import { todayInIndia } from "../../utils/deadline.js";
import { outsideScope } from "../../middlewares/roleScope.js";

const otherDepartment = (res) =>
  res.status(403).json({
    isOk: false,
    status: 403,
    message: "You can only manage advertisements for your own department",
  });

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
      application_fee_concessional,
      start_date,
      end_date,
      probation_period,
      pdf_path,
      other_conditions,
      note,
      enforce_reservation_rules,
      status,
      required_qualifications,
      caste_certificate,
      min_education,
      age_relaxation,
    } = req.body;

    if (outsideScope(req, department)) return otherDepartment(res);
    if (status === "Published") {
      const problem = await minEducationProblem(min_education);
      if (problem) return res.status(422).json({ isOk: false, status: 422, message: problem });
    }

    const adv = new Advertisement({
      post_title,
      department,
      class: cls,
      pay_scale,
      vacancies: normalizeVacancies(vacancies) ?? {
        general: { general: 0, female: 0 },
        sc: { general: 0, female: 0 },
        st: { general: 0, female: 0 },
        sebc: { general: 0, female: 0 },
        ews: { general: 0, female: 0 },
        total: 0,
      },
      age_limit,
      qualification,
      required_qualifications: sanitizeRequiredQualifications(required_qualifications),
      min_education: mongoose.Types.ObjectId.isValid(min_education) ? min_education : undefined,
      age_relaxation: sanitizeAgeRelaxation(age_relaxation),
      caste_certificate: caste_certificate ?? {
        required: false,
        is_compulsory: false,
      },
      ph_description,
      experience_required,
      application_fee,
      application_fee_concessional,
      start_date,
      end_date,
      probation_period,
      pdf_path,
      other_conditions,
      note,
      enforce_reservation_rules:
        enforce_reservation_rules !== undefined
          ? !!enforce_reservation_rules
          : true,
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
      .json({ isOk: false, status: 500, message: "An unexpected error occurred" });
  }
};

// required_qualifications from the form: keep the requirement mode and the
// optional instruction, and keep is_compulsory in step for older readers.
const sanitizeRequiredQualifications = (list) =>
  (Array.isArray(list) ? list : [])
    .filter((rq) => rq && mongoose.Types.ObjectId.isValid(rq.qualification?._id || rq.qualification))
    .map((rq) => {
      const requirement = ["compulsory", "optional", "declaration"].includes(rq.requirement)
        ? rq.requirement
        : rq.is_compulsory === false ? "optional" : "compulsory";
      return {
        qualification: rq.qualification?._id || rq.qualification,
        requirement,
        is_compulsory: requirement === "compulsory",
        instruction: typeof rq.instruction === "string" ? rq.instruction.replace(/[<>]/g, "").trim().slice(0, 300) || undefined : undefined,
      };
    });

// Publishing needs a minimum education that is an education entry with a level.
const minEducationProblem = async (minEducation) => {
  if (!minEducation) return "Minimum education is required before publishing";
  const q = await Qualification.findById(minEducation).select("type level name").lean();
  if (!q || q.type !== "education") return "Minimum education must be an Education entry from the Qualification master";
  if (typeof q.level !== "number") return `Set a level for "${q.name}" in the Qualification master before publishing`;
  return null;
};

// Fields safe to expose to the public (no audit/internal/export data)
const PUBLIC_ADVT_PROJECTION =
  "advt_no slug post_title department class pay_scale vacancies age_limit " +
  "qualification min_education age_relaxation required_qualifications caste_certificate ph_description experience_required application_fee application_fee_concessional " +
  "start_date end_date probation_period other_conditions note enforce_reservation_rules status pdf_path";

const LIST_ADVT_PROJECTION =
  "advt_no slug post_title department class vacancies application_fee application_fee_concessional end_date status pdf_path note pay_scale enforce_reservation_rules";

const VALID_STATUSES = ["Draft", "Published", "Closed", "Archived"];

// Vacancies is a structured matrix: { general, sc, st, sebc, ews, total }
// or legacy number / { total } object.
const normalizeVacancies = (v) => {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "object") {
    const toNum = (val) => {
      const n = Number(val);
      return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
    };
    const general = {
      general: toNum(v.general?.general),
      female: toNum(v.general?.female),
    };
    const sc = {
      general: toNum(v.sc?.general),
      female: toNum(v.sc?.female),
    };
    const st = {
      general: toNum(v.st?.general),
      female: toNum(v.st?.female),
    };
    const sebc = {
      general: toNum(v.sebc?.general),
      female: toNum(v.sebc?.female),
    };
    const ews = {
      general: toNum(v.ews?.general),
      female: toNum(v.ews?.female),
    };
    const sum =
      general.general +
      general.female +
      sc.general +
      sc.female +
      st.general +
      st.female +
      sebc.general +
      sebc.female +
      ews.general +
      ews.female;

    const total = sum > 0 ? sum : toNum(v.total);
    return { general, sc, st, sebc, ews, total };
  }
  const n = Number(v);
  const total = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  return {
    general: { general: total, female: 0 },
    sc: { general: 0, female: 0 },
    st: { general: 0, female: 0 },
    sebc: { general: 0, female: 0 },
    ews: { general: 0, female: 0 },
    total,
  };
};
const vacancyCount = (v) =>
  typeof v === "object" ? Number(v?.total) || 0 : Number(v) || 0;

export const listAdvertisements = async (req, res) => {
  try {
    const isAuthenticated = !!req.session?.user;
    const filter = {};

    if (isAuthenticated) {
      if (req.query.status && VALID_STATUSES.includes(req.query.status))
        filter.status = req.query.status;
    } else {
      // Public callers only ever see Published, non-expired advertisements —
      // regardless of what they pass in the query string.
      filter.status = "Published";
      // end_date is inclusive: an ad ending today is open until midnight in India
      filter.$or = [
        { end_date: null },
        { end_date: { $exists: false } },
        { end_date: { $gte: todayInIndia() } },
      ];
    }

    if (req.query.class && /^(I|II|III|IV)$/.test(req.query.class))
      filter.class = req.query.class;
    if (req.query.dept && mongoose.Types.ObjectId.isValid(req.query.dept))
      filter.department = req.query.dept;

    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const skip = (page - 1) * limit;

    const projection = isAuthenticated
      ? `${LIST_ADVT_PROJECTION} createdAt updatedAt`
      : LIST_ADVT_PROJECTION;

    const query = Advertisement.find(filter)
      .populate("department", "departmentName departmentCode")
      .sort({ end_date: 1 })
      .skip(skip)
      .limit(limit)
      .select(projection)
      .lean();

    const [total, raw] = await Promise.all([
      Advertisement.countDocuments(filter),
      query,
    ]);

    const data = await Promise.all(
      raw.map((item) => attachFileUrls(item, ["pdf_path"])),
    );

    return res.status(200).json({
      isOk: true,
      status: 200,
      data,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: "An unexpected error occurred" });
  }
};

// Staff may see Drafts; nobody else may. Mirrors getAdvertisementById.
const ADVT_STAFF_ROLES = new Set(["ADMIN", "EMPLOYEE", "DEPT_ADMIN"]);

export const getAdvertisementPdf = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res
        .status(404)
        .json({ isOk: false, status: 404, message: "Not found" });

    const adv = await Advertisement.findById(req.params.id).select(
      "pdf_path status",
    );
    if (!adv)
      return res
        .status(404)
        .json({ isOk: false, status: 404, message: "Not found" });

    // status was already being selected here but never checked, so the PDF of
    // an unpublished Draft was downloadable by anyone holding the id.
    if (
      adv.status === "Draft" &&
      !ADVT_STAFF_ROLES.has(req.session?.user?.role)
    )
      return res
        .status(404)
        .json({ isOk: false, status: 404, message: "Not found" });

    if (!normalizeKey(adv.pdf_path))
      return res
        .status(404)
        .json({ isOk: false, status: 404, message: "No PDF available" });

    const stream = await getReadStream(adv.pdf_path);
    if (!stream)
      return res
        .status(404)
        .json({ isOk: false, status: 404, message: "File not found" });

    res.setHeader("Content-Type", "application/pdf");
    return stream.pipe(res);
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: "An unexpected error occurred" });
  }
};

export const getAdvertisementById = async (req, res) => {
  try {
    const { id } = req.params;
    const isAuthenticated = !!req.session?.user;
    const query = mongoose.Types.ObjectId.isValid(id)
      ? { _id: id }
      : { slug: id };
    // Public callers never see Drafts, and only the public projection
    if (!isAuthenticated)
      query.status = { $in: ["Published", "Closed", "Archived"] };

    let find = Advertisement.findOne(query)
      .populate("department", "departmentName departmentCode")
      .populate("required_qualifications.qualification", "name type")
      .populate("min_education", "name level");
    if (!isAuthenticated) find = find.select(PUBLIC_ADVT_PROJECTION);

    const adv = await find;
    if (!adv)
      return res
        .status(404)
        .json({ isOk: false, status: 404, message: "Not found" });
    const data = await attachFileUrls(adv, ["pdf_path"]);
    return res.status(200).json({ isOk: true, status: 200, data });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: "An unexpected error occurred" });
  }
};

export const patchAdvertisement = async (req, res) => {
  try {
    const adv = await Advertisement.findById(req.params.id);
    if (!adv)
      return res
        .status(404)
        .json({ isOk: false, status: 404, message: "Not found" });
    if (outsideScope(req, adv.department)) return otherDepartment(res);
    // Moving an advertisement to another department counts as acting there.
    if ("department" in req.body && outsideScope(req, req.body.department))
      return otherDepartment(res);

    const ALLOWED = [
      "post_title",
      "department",
      "class",
      "pay_scale",
      "vacancies",
      "age_limit",
      "qualification",
      "required_qualifications",
      "caste_certificate",
      "min_education",
      "age_relaxation",
      "ph_description",
      "experience_required",
      "application_fee",
      "application_fee_concessional",
      "start_date",
      "end_date",
      "probation_period",
      "other_conditions",
      "note",
      "enforce_reservation_rules",
    ];
    for (const key of ALLOWED) {
      if (req.body[key] === undefined) continue;
      if (key === "vacancies") adv[key] = normalizeVacancies(req.body[key]);
      else if (key === "required_qualifications") adv[key] = sanitizeRequiredQualifications(req.body[key]);
      else if (key === "age_relaxation") adv[key] = sanitizeAgeRelaxation(req.body[key]);
      else if (key === "min_education")
        adv[key] = mongoose.Types.ObjectId.isValid(req.body[key]) ? req.body[key] : undefined;
      else adv[key] = req.body[key];
    }
    // A published advertisement must keep a valid minimum education.
    if (adv.status === "Published" && ("min_education" in req.body)) {
      const problem = await minEducationProblem(adv.min_education);
      if (problem) return res.status(422).json({ isOk: false, status: 422, message: problem });
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
      .json({ isOk: false, status: 500, message: "An unexpected error occurred" });
  }
};

export const deleteAdvertisement = async (req, res) => {
  try {
    const adv = await Advertisement.findById(req.params.id);
    if (!adv)
      return res
        .status(404)
        .json({ isOk: false, status: 404, message: "Not found" });

    const applicationCount = await Application.countDocuments({
      advt_no: adv.advt_no,
    });
    if (applicationCount > 0)
      return res.status(409).json({
        isOk: false,
        status: 409,
        message: `Cannot delete: ${applicationCount} application(s) reference this advertisement.`,
      });

    if (adv.pdf_path) await deleteFile(adv.pdf_path);
    await Advertisement.findByIdAndDelete(req.params.id);
    return res
      .status(200)
      .json({ isOk: true, status: 200, message: "Deleted" });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: "An unexpected error occurred" });
  }
};

export const searchAdvertisements = async (req, res) => {
  try {
    const {
      skip = 0,
      per_page = 10,
      match,
      status,
      department,
      sorton,
      sortdir,
    } = req.body;

    const matchCond = {};
    if (status) matchCond.status = status;
    if (department && mongoose.Types.ObjectId.isValid(department))
      matchCond.department = new mongoose.Types.ObjectId(department);

    const pipeline = [];
    if (match) {
      pipeline.push({
        $match: {
          $or: [
            { "post_title.en": { $regex: escapeRegex(match), $options: "i" } },
            { advt_no: { $regex: escapeRegex(match), $options: "i" } },
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
    // Project only what the admin list table renders
    pipeline.push({
      $project: {
        advt_no: 1,
        "post_title.en": 1,
        "post_title.gu": 1,
        "department._id": 1,
        "department.departmentName": 1,
        class: 1,
        status: 1,
        end_date: 1,
        application_fee: 1,
        application_fee_concessional: 1,
        createdAt: 1,
      },
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
      .json({ isOk: false, status: 500, message: "An unexpected error occurred" });
  }
};

const STATUS_TRANSITIONS = {
  Draft: ["Published"],
  Published: ["Archived"],
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
    if (outsideScope(req, adv.department)) return otherDepartment(res);

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
      const eduProblem = await minEducationProblem(adv.min_education);
      if (eduProblem)
        return res.status(422).json({ isOk: false, status: 422, message: eduProblem, fields: ["min_education"] });
      if (!adv.start_date) missing.push("start_date");
      if (!adv.end_date) missing.push("end_date");
      if (!(vacancyCount(adv.vacancies) > 0)) missing.push("vacancies");
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
      .json({ isOk: false, status: 500, message: "An unexpected error occurred" });
  }
};

export const uploadAdvertisementPdf = async (req, res) => {
  try {
    const adv = await Advertisement.findById(req.params.id);
    if (!adv)
      return res
        .status(404)
        .json({ isOk: false, status: 404, message: "Not found" });
    if (outsideScope(req, adv.department)) return otherDepartment(res);
    if (!req.file)
      return res
        .status(422)
        .json({ isOk: false, status: 422, message: "PDF file required" });

    if (adv.pdf_path) await deleteFile(adv.pdf_path);

    const filename = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.pdf`;
    const stored = await uploadBuffer({
      module: "advertisements",
      buffer: req.file.buffer,
      filename,
      contentType: "application/pdf",
    });
    adv.pdf_path = stored.key;
    adv.updatedBy = req.user.id;
    await adv.save();
    const pdf_url = await resolveFileUrl(adv.pdf_path);
    return res.status(200).json({
      isOk: true,
      status: 200,
      message: "PDF uploaded",
      data: { pdf_path: adv.pdf_path, pdf_url },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: "An unexpected error occurred" });
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
      .json({ isOk: false, status: 500, message: "An unexpected error occurred" });
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
      .json({ isOk: false, status: 500, message: "An unexpected error occurred" });
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

    const stream = await getReadStream(ze.file_path);
    if (!stream)
      return res
        .status(404)
        .json({ isOk: false, status: 404, message: "File not found" });

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="applications-${(adv.advt_no ?? String(adv._id)).replace(/\//g, "-")}.zip"`,
    );
    return stream.pipe(res);
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: "An unexpected error occurred" });
  }
};
