import mongoose from "mongoose";
import Patient from "../../models/Patient.js";
import MasterData from "../../models/MasterData.js";
import { generatePatientId } from "../../utils/patientIdGenerator.js";

const MASTER_REF_FIELDS = {
  titleId: "TITLE",
  genderId: "GENDER",
  bloodGroupId: "BLOOD_GROUP",
  maritalStatusId: "MARITAL_STATUS",
  occupationId: "OCCUPATION_TYPE",
  idProofTypeId: "ID_PROOF_TYPE",
  referralSourceId: "REFERRAL_SOURCE",
};

const computeAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age >= 0 ? age : null;
};

const validateMasterRefs = async (body) => {
  for (const [field, expectedCategory] of Object.entries(MASTER_REF_FIELDS)) {
    const value = body[field];
    if (!value) continue;
    if (!mongoose.Types.ObjectId.isValid(value)) {
      return { ok: false, message: `${field} is not a valid id` };
    }
    const doc = await MasterData.findById(value).lean();
    if (!doc) return { ok: false, message: `${field} not found in MasterData` };
    if (doc.category !== expectedCategory) {
      return {
        ok: false,
        message: `${field} must reference category ${expectedCategory}, got ${doc.category}`,
      };
    }
  }

  if (body.emergencyContact?.relationshipId) {
    const id = body.emergencyContact.relationshipId;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { ok: false, message: "emergencyContact.relationshipId invalid" };
    }
    const doc = await MasterData.findById(id).lean();
    if (!doc || doc.category !== "RELATIONSHIP_TYPE") {
      return {
        ok: false,
        message: "emergencyContact.relationshipId must be RELATIONSHIP_TYPE",
      };
    }
  }

  if (Array.isArray(body.allergies)) {
    for (const a of body.allergies) {
      if (!a?.allergyTypeId) continue;
      if (!mongoose.Types.ObjectId.isValid(a.allergyTypeId)) {
        return { ok: false, message: "allergies.allergyTypeId invalid" };
      }
      const doc = await MasterData.findById(a.allergyTypeId).lean();
      if (!doc || doc.category !== "ALLERGY_TYPE") {
        return {
          ok: false,
          message: "allergies.allergyTypeId must be ALLERGY_TYPE",
        };
      }
    }
  }

  return { ok: true };
};

export const createPatient = async (req, res) => {
  try {
    const body = req.body || {};

    if (!body.firstName || !body.mobileNumber || !body.genderId) {
      return res.status(400).json({
        isOk: false,
        status: 400,
        message: "firstName, mobileNumber, and genderId are required",
      });
    }

    const refsCheck = await validateMasterRefs(body);
    if (!refsCheck.ok) {
      return res.status(400).json({
        isOk: false,
        status: 400,
        message: refsCheck.message,
      });
    }

    const patientId = await generatePatientId();
    const userId = req.user?.id || null;

    const patient = new Patient({
      ...body,
      patientId,
      status: "active",
      isActive: body.isActive !== undefined ? body.isActive : true,
      createdBy: userId,
      updatedBy: userId,
    });

    await patient.save();

    return res.status(201).json({
      isOk: true,
      status: 201,
      message: "Patient created successfully",
      data: { _id: patient._id, patientId: patient.patientId },
    });
  } catch (error) {
    console.error("Error in createPatient:", error);
    return res.status(500).json({
      isOk: false,
      status: 500,
      message: "Internal server error",
    });
  }
};

export const quickCreatePatient = async (req, res) => {
  try {
    const { firstName, mobileNumber, genderId } = req.body || {};

    if (!firstName || !mobileNumber || !genderId) {
      return res.status(400).json({
        isOk: false,
        status: 400,
        message: "firstName, mobileNumber, and genderId are required",
      });
    }

    const refsCheck = await validateMasterRefs({ genderId });
    if (!refsCheck.ok) {
      return res.status(400).json({
        isOk: false,
        status: 400,
        message: refsCheck.message,
      });
    }

    const patientId = await generatePatientId();
    const userId = req.user?.id || null;

    const patient = new Patient({
      patientId,
      firstName,
      mobileNumber,
      genderId,
      status: "partial",
      isActive: true,
      createdBy: userId,
      updatedBy: userId,
    });

    await patient.save();

    return res.status(201).json({
      isOk: true,
      status: 201,
      message: "Patient created successfully",
      data: { _id: patient._id, patientId: patient.patientId },
    });
  } catch (error) {
    console.error("Error in quickCreatePatient:", error);
    return res.status(500).json({
      isOk: false,
      status: 500,
      message: "Internal server error",
    });
  }
};

export const updatePatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    const body = req.body || {};

    const patient = await Patient.findOne({
      _id: patientId,
      isDeleted: false,
    });
    if (!patient) {
      return res.status(404).json({
        isOk: false,
        status: 404,
        message: "Patient not found",
      });
    }

    const refsCheck = await validateMasterRefs(body);
    if (!refsCheck.ok) {
      return res.status(400).json({
        isOk: false,
        status: 400,
        message: refsCheck.message,
      });
    }

    const blocked = [
      "patientId",
      "registrationDate",
      "createdBy",
      "isDeleted",
      "deletedAt",
      "deletedBy",
      "createdAt",
      "updatedAt",
      "_id",
    ];
    for (const k of Object.keys(body)) {
      if (blocked.includes(k)) continue;
      patient[k] = body[k];
    }
    patient.updatedBy = req.user?.id || patient.updatedBy;

    await patient.save();

    return res.status(200).json({
      isOk: true,
      status: 200,
      message: "Patient updated successfully",
    });
  } catch (error) {
    console.error("Error in updatePatient:", error);
    return res.status(500).json({
      isOk: false,
      status: 500,
      message: "Internal server error",
    });
  }
};

export const deletePatient = async (req, res) => {
  try {
    const { patientId } = req.params;

    const patient = await Patient.findOne({
      _id: patientId,
      isDeleted: false,
    });
    if (!patient) {
      return res.status(404).json({
        isOk: false,
        status: 404,
        message: "Patient not found",
      });
    }

    patient.isDeleted = true;
    patient.isActive = false;
    patient.deletedAt = new Date();
    patient.deletedBy = req.user?.id || null;
    patient.updatedBy = req.user?.id || null;

    await patient.save();

    return res.status(200).json({
      isOk: true,
      status: 200,
      message: "Patient removed successfully",
    });
  } catch (error) {
    console.error("Error in deletePatient:", error);
    return res.status(500).json({
      isOk: false,
      status: 500,
      message: "Internal server error",
    });
  }
};

export const restorePatient = async (req, res) => {
  try {
    const { patientId } = req.params;

    const patient = await Patient.findOne({
      _id: patientId,
      isDeleted: true,
    });
    if (!patient) {
      return res.status(404).json({
        isOk: false,
        status: 404,
        message: "Deleted patient not found",
      });
    }

    patient.isDeleted = false;
    patient.deletedAt = null;
    patient.deletedBy = null;
    patient.updatedBy = req.user?.id || null;

    await patient.save();

    return res.status(200).json({
      isOk: true,
      status: 200,
      message: "Patient restored successfully",
    });
  } catch (error) {
    console.error("Error in restorePatient:", error);
    return res.status(500).json({
      isOk: false,
      status: 500,
      message: "Internal server error",
    });
  }
};

export const getPatientById = async (req, res) => {
  try {
    const { patientId } = req.params;

    const patient = await Patient.findOne({
      _id: patientId,
      isDeleted: false,
    })
      .populate("titleId")
      .populate("genderId")
      .populate("bloodGroupId")
      .populate("maritalStatusId")
      .populate("occupationId")
      .populate("idProofTypeId")
      .populate("referralSourceId")
      .populate("address.countryId")
      .populate("address.stateId")
      .populate("address.cityId")
      .populate("emergencyContact.relationshipId")
      .populate("allergies.allergyTypeId")
      .populate("referredByDoctor")
      .populate("createdBy", "employeeName emailOffice")
      .populate("updatedBy", "employeeName emailOffice");

    if (!patient) {
      return res.status(404).json({
        isOk: false,
        status: 404,
        message: "Patient not found",
      });
    }

    const data = patient.toObject();
    data.age = computeAge(data.dateOfBirth);

    return res.status(200).json({
      isOk: true,
      status: 200,
      data,
    });
  } catch (error) {
    console.error("Error in getPatientById:", error);
    return res.status(500).json({
      isOk: false,
      status: 500,
      message: "Internal server error",
    });
  }
};

export const listPatients = async (req, res) => {
  try {
    const patients = await Patient.find({
      isDeleted: false,
      isActive: true,
    })
      .select("patientId firstName lastName mobileNumber status")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      isOk: true,
      status: 200,
      data: patients,
    });
  } catch (error) {
    console.error("Error in listPatients:", error);
    return res.status(500).json({
      isOk: false,
      status: 500,
      message: error.message,
    });
  }
};

export const listPatientsByParams = async (req, res) => {
  try {
    let { skip, per_page, sorton, sortdir, match, isActive, isDeleted } =
      req.body || {};

    skip = Number.isFinite(skip) ? skip : 0;
    per_page = Number.isFinite(per_page) ? per_page : 100;

    let matchCondition = { isDeleted: isDeleted === true };
    if (isActive !== undefined && isActive !== null && isActive !== "") {
      matchCondition.isActive = isActive;
    }

    let query = [
      { $match: matchCondition },
      {
        $lookup: {
          from: "masterdatas",
          localField: "genderId",
          foreignField: "_id",
          as: "gender",
        },
      },
      { $unwind: { path: "$gender", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "masterdatas",
          localField: "bloodGroupId",
          foreignField: "_id",
          as: "bloodGroup",
        },
      },
      { $unwind: { path: "$bloodGroup", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "masterdatas",
          localField: "titleId",
          foreignField: "_id",
          as: "title",
        },
      },
      { $unwind: { path: "$title", preserveNullAndEmptyArrays: true } },
      {
        $facet: {
          stage1: [{ $group: { _id: null, count: { $sum: 1 } } }],
          stage2: [{ $skip: skip }, { $limit: per_page }],
        },
      },
      { $unwind: "$stage1" },
      {
        $project: {
          count: "$stage1.count",
          data: "$stage2",
        },
      },
    ];

    if (match) {
      const searchConditions = {
        $or: [
          { firstName: { $regex: match, $options: "i" } },
          { lastName: { $regex: match, $options: "i" } },
          { mobileNumber: { $regex: match, $options: "i" } },
          { email: { $regex: match, $options: "i" } },
          { patientId: { $regex: match, $options: "i" } },
        ],
      };
      if (mongoose.Types.ObjectId.isValid(match)) {
        searchConditions.$or.push({
          genderId: new mongoose.Types.ObjectId(match),
        });
      }
      query = [{ $match: searchConditions }].concat(query);
    }

    if (sorton && sortdir) {
      const sort = {};
      sort[sorton] = sortdir === "desc" ? -1 : 1;
      query = [{ $sort: sort }].concat(query);
    } else {
      query = [{ $sort: { createdAt: -1 } }].concat(query);
    }

    const list = await Patient.aggregate(query);

    if (list.length > 0 && Array.isArray(list[0].data)) {
      list[0].data = list[0].data.map((p) => ({
        ...p,
        age: computeAge(p.dateOfBirth),
      }));
    }

    return res.status(200).json({
      isOk: true,
      status: 200,
      data: list,
    });
  } catch (error) {
    console.error("Error in listPatientsByParams:", error);
    return res.status(500).json({
      isOk: false,
      status: 500,
      message: error.message,
    });
  }
};

export const duplicateCheck = async (req, res) => {
  try {
    const { mobile, firstName, lastName } = req.query || {};

    if (!mobile && !firstName && !lastName) {
      return res.status(400).json({
        isOk: false,
        status: 400,
        message: "Provide mobile, firstName, or lastName",
      });
    }

    const orConditions = [];
    if (mobile) orConditions.push({ mobileNumber: mobile });

    if (firstName || lastName) {
      const nameMatch = {};
      if (firstName) {
        nameMatch.firstName = { $regex: firstName.trim(), $options: "i" };
      }
      if (lastName) {
        nameMatch.lastName = { $regex: lastName.trim(), $options: "i" };
      }
      if (Object.keys(nameMatch).length > 0) orConditions.push(nameMatch);
    }

    const matches = await Patient.find({
      isDeleted: false,
      $or: orConditions,
    })
      .select(
        "patientId firstName lastName mobileNumber status registrationDate",
      )
      .limit(20);

    return res.status(200).json({
      isOk: true,
      status: 200,
      data: matches,
    });
  } catch (error) {
    console.error("Error in duplicateCheck:", error);
    return res.status(500).json({
      isOk: false,
      status: 500,
      message: "Internal server error",
    });
  }
};
