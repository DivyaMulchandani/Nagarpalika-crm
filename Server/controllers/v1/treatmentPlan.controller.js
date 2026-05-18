import mongoose from "mongoose";
import TreatmentPlan from "../../models/TreatmentPlan.js";
import Appointment from "../../models/Appointment.js";

export const createTreatmentPlan = async (req, res) => {
  try {
    const { patientId, doctorId, planName, description, milestones } = req.body;

    if (!patientId || !doctorId || !planName) {
      return res.status(400).json({
        message: "patientId, doctorId, and planName are required",
        isOk: false,
        status: 400,
      });
    }

    if (!milestones || milestones.length === 0) {
      return res.status(400).json({
        message: "At least one milestone is required",
        isOk: false,
        status: 400,
      });
    }

    const totalEstimatedCost = milestones.reduce((sum, m) => sum + (Number(m.estimatedCost) || 0), 0);

    const plan = new TreatmentPlan({
      patientId,
      doctorId,
      planName,
      description,
      milestones,
      totalEstimatedCost,
      createdBy: req.user?.id,
    });

    await plan.save();

    return res.status(201).json({
      message: "Treatment plan created successfully",
      isOk: true,
      status: 201,
      data: { _id: plan._id },
    });
  } catch (error) {
    console.error("Error in createTreatmentPlan:", error);
    return res.status(500).json({ message: "Internal server error", isOk: false, status: 500 });
  }
};

export const updateTreatmentPlan = async (req, res) => {
  try {
    const { planId } = req.params;
    const plan = await TreatmentPlan.findById(planId);

    if (!plan) {
      return res.status(400).json({ message: "Treatment plan not found", isOk: false, status: 400 });
    }

    const { planName, description, milestones, status } = req.body;
    if (planName !== undefined) plan.planName = planName;
    if (description !== undefined) plan.description = description;
    if (status !== undefined) plan.status = status;
    if (milestones !== undefined) {
      plan.milestones = milestones;
      plan.totalEstimatedCost = milestones.reduce((sum, m) => sum + (Number(m.estimatedCost) || 0), 0);
    }

    plan.updatedBy = req.user?.id;
    await plan.save();

    return res.status(200).json({
      message: "Treatment plan updated successfully",
      isOk: true,
      status: 200,
    });
  } catch (error) {
    console.error("Error in updateTreatmentPlan:", error);
    return res.status(500).json({ message: "Internal server error", isOk: false, status: 500 });
  }
};

export const acceptTreatmentPlan = async (req, res) => {
  try {
    const { planId } = req.params;
    const plan = await TreatmentPlan.findById(planId);

    if (!plan) {
      return res.status(400).json({ message: "Treatment plan not found", isOk: false, status: 400 });
    }

    if (plan.status !== "proposed") {
      return res.status(400).json({ message: "Only proposed plans can be accepted", isOk: false, status: 400 });
    }

    const appointments = [];
    for (const milestone of plan.milestones) {
      if (milestone.status === "pending" && milestone.suggestedDate) {
        const appt = new Appointment({
          appointmentDate: milestone.suggestedDate,
          startTime: "09:00",
          patientId: plan.patientId,
          doctorId: plan.doctorId,
          treatmentPlanId: plan._id,
          status: "scheduled",
          createdBy: req.user?.id,
        });
        await appt.save();
        milestone.appointmentId = appt._id;
        milestone.status = "scheduled";
        appointments.push(appt._id);
      }
    }

    plan.status = "accepted";
    plan.updatedBy = req.user?.id;
    await plan.save();

    return res.status(200).json({
      message: `Plan accepted. ${appointments.length} appointments created.`,
      isOk: true,
      status: 200,
      data: { appointmentIds: appointments },
    });
  } catch (error) {
    console.error("Error in acceptTreatmentPlan:", error);
    return res.status(500).json({ message: "Internal server error", isOk: false, status: 500 });
  }
};

export const getTreatmentPlanById = async (req, res) => {
  try {
    const { planId } = req.params;
    const plan = await TreatmentPlan.findById(planId)
      .populate("patientId", "patientId firstName lastName mobileNumber")
      .populate("doctorId", "doctorName doctorCode")
      .populate("milestones.procedureId", "label code")
      .populate("milestones.appointmentId", "appointmentDate startTime status");

    if (!plan) {
      return res.status(400).json({ message: "Treatment plan not found", isOk: false, status: 400 });
    }

    return res.status(200).json({
      message: "Treatment plan found",
      data: plan,
      isOk: true,
      status: 200,
    });
  } catch (error) {
    console.error("Error in getTreatmentPlanById:", error);
    return res.status(500).json({ message: "Internal server error", isOk: false, status: 500 });
  }
};

export const deleteTreatmentPlan = async (req, res) => {
  try {
    const { planId } = req.params;
    const plan = await TreatmentPlan.findById(planId);

    if (!plan) {
      return res.status(400).json({ message: "Treatment plan not found", isOk: false, status: 400 });
    }

    if (["in_progress", "completed"].includes(plan.status)) {
      return res.status(400).json({ message: "Cannot delete an active or completed plan", isOk: false, status: 400 });
    }

    await TreatmentPlan.findByIdAndDelete(planId);

    return res.status(200).json({
      message: "Treatment plan deleted successfully",
      isOk: true,
      status: 200,
    });
  } catch (error) {
    console.error("Error in deleteTreatmentPlan:", error);
    return res.status(500).json({ message: "Internal server error", isOk: false, status: 500 });
  }
};

export const listTreatmentPlansByParams = async (req, res) => {
  try {
    let { skip, per_page, sorton, sortdir, match, isActive, patientId, doctorId, status } = req.body;

    let matchCondition = {};
    if (isActive !== undefined && isActive !== null && isActive !== "") matchCondition.isActive = isActive;
    if (patientId) matchCondition.patientId = new mongoose.Types.ObjectId(patientId);
    if (doctorId) matchCondition.doctorId = new mongoose.Types.ObjectId(doctorId);
    if (status) matchCondition.status = status;

    let query = [
      { $match: matchCondition },
      {
        $lookup: { from: "patients", localField: "patientId", foreignField: "_id", as: "patient" },
      },
      { $unwind: { path: "$patient", preserveNullAndEmptyArrays: true } },
      {
        $lookup: { from: "doctors", localField: "doctorId", foreignField: "_id", as: "doctor" },
      },
      { $unwind: { path: "$doctor", preserveNullAndEmptyArrays: true } },
      {
        $facet: {
          stage1: [{ $group: { _id: null, count: { $sum: 1 } } }],
          stage2: [{ $skip: skip }, { $limit: per_page }],
        },
      },
      { $unwind: "$stage1" },
      { $project: { count: "$stage1.count", data: "$stage2" } },
    ];

    if (match) {
      query.splice(3, 0, {
        $match: {
          $or: [
            { planName: { $regex: match, $options: "i" } },
            { "patient.firstName": { $regex: match, $options: "i" } },
            { "patient.lastName": { $regex: match, $options: "i" } },
            { "patient.patientId": { $regex: match, $options: "i" } },
            { "doctor.doctorName": { $regex: match, $options: "i" } },
          ],
        },
      });
    }

    if (sorton && sortdir) {
      let sort = {};
      sort[sorton] = sortdir === "desc" ? -1 : 1;
      query = [{ $sort: sort }].concat(query);
    } else {
      query = [{ $sort: { createdAt: -1 } }].concat(query);
    }

    const list = await TreatmentPlan.aggregate(query);

    return res.status(200).json({ isOk: true, data: list, status: 200 });
  } catch (error) {
    console.error("Error in listTreatmentPlansByParams:", error);
    return res.status(500).json({ isOk: false, message: error.message, status: 500 });
  }
};

export const getPatientTreatmentPlans = async (req, res) => {
  try {
    const { patientId } = req.params;
    const plans = await TreatmentPlan.find({ patientId })
      .populate("doctorId", "doctorName doctorCode")
      .sort({ createdAt: -1 });

    return res.status(200).json({ isOk: true, data: plans, status: 200 });
  } catch (error) {
    console.error("Error in getPatientTreatmentPlans:", error);
    return res.status(500).json({ isOk: false, message: error.message, status: 500 });
  }
};
