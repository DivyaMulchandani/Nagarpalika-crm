import DoctorModels from "../../models/Doctor.js";
import Appointment from "../../models/Appointment.js";
import TreatmentPlan from "../../models/TreatmentPlan.js";
import mongoose from "mongoose";
import bcrypt from "bcrypt";

export const createDoctor = async (req, res) => {
  try {
    const {
      doctorName,
      doctorCode,
      email,
      password,
      roleId,
      specializationId,
      qualifications,
      registrationNumber,
      mobileNumber,
      consultationFee,
      followUpFee,
      slotDurationId,
      isActive,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        isOk: false,
        message: "Email and password are required",
      });
    }

    const existing = await DoctorModels.findOne({
      $or: [{ email }, ...(doctorCode ? [{ doctorCode }] : [])],
    });
    if (existing) {
      const field = doctorCode && existing.doctorCode === doctorCode ? "Doctor code" : "Email";
      return res.status(400).json({
        isOk: false,
        message: `${field} already exists`,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const doctor = new DoctorModels({
      doctorName,
      doctorCode,
      email,
      password: hashedPassword,
      roleId: roleId || undefined,
      specializationId: specializationId || undefined,
      qualifications,
      registrationNumber,
      mobileNumber,
      consultationFee,
      followUpFee,
      slotDurationId: slotDurationId || undefined,
      isActive,
    });

    await doctor.save();

    return res.status(201).json({
      isOk: true,
      message: "Doctor created successfully",
      status: 201,
    });
  } catch (error) {
    console.error("Error in createDoctor:", error);
    return res.status(500).json({
      isOk: false,
      message: error.message,
      status: 500,
    });
  }
};

export const updateDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const {
      doctorName,
      doctorCode,
      email,
      roleId,
      specializationId,
      qualifications,
      registrationNumber,
      mobileNumber,
      consultationFee,
      followUpFee,
      slotDurationId,
      isActive,
    } = req.body;

    const doctor = await DoctorModels.findById(doctorId);
    if (!doctor) {
      return res.status(400).json({
        isOk: false,
        message: "Doctor not found",
        status: 400,
      });
    }

    if (email && email !== doctor.email) {
      const existing = await DoctorModels.findOne({
        email,
        _id: { $ne: doctorId },
      });
      if (existing) {
        return res.status(400).json({
          isOk: false,
          message: "Email already exists",
          status: 400,
        });
      }
    }

    doctor.doctorName = doctorName ?? doctor.doctorName;
    doctor.doctorCode = doctorCode ?? doctor.doctorCode;
    doctor.email = email ?? doctor.email;
    doctor.roleId = roleId || doctor.roleId;
    doctor.specializationId = specializationId || doctor.specializationId;
    doctor.qualifications = qualifications ?? doctor.qualifications;
    doctor.registrationNumber = registrationNumber ?? doctor.registrationNumber;
    doctor.mobileNumber = mobileNumber ?? doctor.mobileNumber;
    doctor.consultationFee = consultationFee ?? doctor.consultationFee;
    doctor.followUpFee = followUpFee ?? doctor.followUpFee;
    doctor.slotDurationId = slotDurationId || doctor.slotDurationId;
    doctor.isActive = isActive ?? doctor.isActive;

    await doctor.save();

    return res.status(200).json({
      isOk: true,
      message: "Doctor updated successfully",
      status: 200,
    });
  } catch (error) {
    console.error("Error in updateDoctor:", error);
    return res.status(500).json({
      isOk: false,
      message: error.message,
      status: 500,
    });
  }
};

export const resetDoctorPassword = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { password } = req.body;

    const doctor = await DoctorModels.findById(doctorId);
    if (!doctor) {
      return res.status(400).json({
        isOk: false,
        message: "Doctor not found",
        status: 400,
      });
    }

    doctor.password = await bcrypt.hash(password, 10);
    await doctor.save();

    return res.status(200).json({
      isOk: true,
      message: "Password reset successfully",
      status: 200,
    });
  } catch (error) {
    console.error("Error in resetDoctorPassword:", error);
    return res.status(500).json({
      isOk: false,
      message: error.message,
      status: 500,
    });
  }
};

export const deleteDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const doctor = await DoctorModels.findById(doctorId);

    if (!doctor) {
      return res.status(404).json({
        isOk: false,
        message: "Doctor not found",
        status: 404,
      });
    }

    const [apptCount, planCount] = await Promise.all([
      Appointment.countDocuments({ doctorId, isActive: { $ne: false } }),
      TreatmentPlan.countDocuments({ doctorId, isActive: { $ne: false } }),
    ]);

    if (apptCount > 0 || planCount > 0) {
      return res.status(409).json({
        isOk: false,
        status: 409,
        message: `Cannot delete doctor: ${apptCount} appointment(s) and ${planCount} treatment plan(s) reference this doctor. Deactivate instead.`,
      });
    }

    await DoctorModels.findByIdAndDelete(doctorId).exec();

    return res.status(200).json({
      isOk: true,
      message: "Doctor deleted successfully",
      status: 200,
    });
  } catch (error) {
    console.error("Error in deleteDoctor:", error);
    return res.status(500).json({
      isOk: false,
      message: error.message,
      status: 500,
    });
  }
};

export const getDoctorById = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const doctor = await DoctorModels.findById(doctorId)
      .populate("specializationId")
      .populate("slotDurationId")
      .populate("roleId");

    if (!doctor) {
      return res.status(404).json({
        isOk: false,
        message: "Doctor not found",
        status: 404,
      });
    }

    const dataToSend = doctor.toObject();
    delete dataToSend.password;

    return res.status(200).json({
      isOk: true,
      data: dataToSend,
      status: 200,
    });
  } catch (error) {
    console.error("Error in getDoctorById:", error);
    return res.status(500).json({
      isOk: false,
      message: error.message,
      status: 500,
    });
  }
};

export const listDoctors = async (req, res) => {
  try {
    const doctors = await DoctorModels.find({ isActive: true })
      .populate("specializationId")
      .populate("slotDurationId")
      .populate("roleId")
      .select("-password");

    return res.status(200).json({
      isOk: true,
      data: doctors,
      status: 200,
    });
  } catch (error) {
    console.error("Error in listDoctors:", error);
    return res.status(500).json({
      isOk: false,
      message: error.message,
      status: 500,
    });
  }
};

export const listDoctorsByParams = async (req, res) => {
  try {
    let { skip, per_page, sorton, sortdir, match, isActive } = req.body;

    let matchCondition = {};
    if (isActive !== undefined && isActive !== null && isActive !== "") {
      matchCondition.isActive = isActive;
    }

    let query = [
      { $match: matchCondition },
      {
        $lookup: {
          from: "masterdatas",
          localField: "specializationId",
          foreignField: "_id",
          as: "specialization",
        },
      },
      {
        $unwind: {
          path: "$specialization",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "rolemasters",
          localField: "roleId",
          foreignField: "_id",
          as: "role",
        },
      },
      {
        $unwind: {
          path: "$role",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: { password: 0 },
      },
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
      let searchConditions = {
        $or: [
          { doctorName: { $regex: match, $options: "i" } },
          { doctorCode: { $regex: match, $options: "i" } },
          { email: { $regex: match, $options: "i" } },
          { mobileNumber: { $regex: match, $options: "i" } },
          { "specialization.label": { $regex: match, $options: "i" } },
        ],
      };
      query = [{ $match: searchConditions }].concat(query);
    }

    if (sorton && sortdir) {
      let sort = {};
      sort[sorton] = sortdir === "desc" ? -1 : 1;
      query = [{ $sort: sort }].concat(query);
    } else {
      query = [{ $sort: { createdAt: -1 } }].concat(query);
    }

    const list = await DoctorModels.aggregate(query);

    return res.status(200).json({
      data: list,
      status: 200,
    });
  } catch (error) {
    console.error("Error in listDoctorsByParams:", error);
    return res.status(500).json({
      isOk: false,
      message: error.message,
      status: 500,
    });
  }
};
