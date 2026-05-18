import mongoose from "mongoose";
import Appointment from "../../models/Appointment.js";

const VALID_TRANSITIONS = {
  scheduled: ["confirmed", "arrived", "cancelled", "no_show", "rescheduled"],
  confirmed: ["arrived", "cancelled", "no_show", "rescheduled"],
  arrived: ["in_consultation", "cancelled"],
  in_consultation: ["completed"],
  completed: ["checked_out"],
  checked_out: ["follow_up_planned"],
};

export const createAppointment = async (req, res) => {
  try {
    const {
      appointmentDate, startTime, endTime, slotDuration,
      patientId, doctorId, parentAppointmentId, treatmentPlanId,
      appointmentTypeId, appointmentSourceId, isEmergency, isWalkIn,
      status,
    } = req.body;

    if (!appointmentDate || !startTime || !patientId || !doctorId) {
      return res.status(400).json({
        message: "appointmentDate, startTime, patientId, and doctorId are required",
        isOk: false,
        status: 400,
      });
    }

    if (!isEmergency) {
      const conflict = await Appointment.findOne({
        doctorId,
        appointmentDate: new Date(appointmentDate),
        startTime,
        status: { $nin: ["cancelled", "no_show", "rescheduled"] },
      });
      if (conflict) {
        return res.status(400).json({
          message: "Doctor already has an appointment at this time slot",
          isOk: false,
          status: 400,
        });
      }
    }

    const appointment = new Appointment({
      appointmentDate,
      startTime,
      endTime,
      slotDuration,
      patientId,
      doctorId,
      parentAppointmentId: parentAppointmentId || undefined,
      treatmentPlanId: treatmentPlanId || undefined,
      appointmentTypeId: appointmentTypeId || undefined,
      appointmentSourceId: appointmentSourceId || undefined,
      isEmergency: !!isEmergency,
      isWalkIn: !!isWalkIn,
      status: isWalkIn || isEmergency ? "arrived" : (status || "scheduled"),
      createdBy: req.user?.id,
    });

    await appointment.save();

    return res.status(201).json({
      message: "Appointment created successfully",
      isOk: true,
      status: 201,
      data: { _id: appointment._id },
    });
  } catch (error) {
    console.error("Error in createAppointment:", error);
    return res.status(500).json({
      message: "Internal server error",
      isOk: false,
      status: 500,
    });
  }
};

export const updateAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(400).json({
        message: "Appointment not found",
        isOk: false,
        status: 400,
      });
    }

    if (req.user?.role === "DOCTOR" && String(appointment.doctorId) !== String(req.user.id)) {
      return res.status(403).json({
        message: "Forbidden",
        isOk: false,
        status: 403,
      });
    }

    const blocked = [
      "_id",
      "createdBy",
      "createdAt",
      "updatedBy",
      "updatedAt",
      "doctorId",
      "patientId",
      "status",
      "cancelledBy",
      "cancelledAt",
    ];
    const body = req.body;
    const optionalObjectIdFields = [
      "parentAppointmentId",
      "treatmentPlanId",
      "appointmentTypeId",
      "appointmentSourceId",
      "cancellationReasonId",
      "nextAppointmentDoctorId",
    ];

    optionalObjectIdFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(body, field) && body[field] === "") {
        body[field] = undefined;
      }
    });

    for (const key of Object.keys(body)) {
      if (!blocked.includes(key)) {
        appointment[key] = body[key];
      }
    }

    if (body.procedures && Array.isArray(body.procedures)) {
      const total = body.procedures.reduce((sum, p) => sum + ((p.cost || 0) * (p.quantity || 1)), 0);
      appointment.totalCost = total;

      let discount = 0;
      if (appointment.discountType === "percentage") {
        discount = total * (appointment.discountValue / 100);
      } else if (appointment.discountType === "fixed") {
        discount = appointment.discountValue;
      }
      appointment.netAmount = Math.max(0, total - discount);
    }

    appointment.updatedBy = req.user?.id;
    await appointment.save();

    return res.status(200).json({
      message: "Appointment updated successfully",
      isOk: true,
      status: 200,
    });
  } catch (error) {
    console.error("Error in updateAppointment:", error);
    return res.status(500).json({
      message: "Internal server error",
      isOk: false,
      status: 500,
    });
  }
};

export const updateAppointmentStatus = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { status, cancellationReasonId, cancellationNotes } = req.body;

    if (!status) {
      return res.status(400).json({
        message: "Status is required",
        isOk: false,
        status: 400,
      });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(400).json({
        message: "Appointment not found",
        isOk: false,
        status: 400,
      });
    }

    if (req.user?.role === "DOCTOR" && String(appointment.doctorId) !== String(req.user.id)) {
      return res.status(403).json({
        message: "Forbidden",
        isOk: false,
        status: 403,
      });
    }

    const allowed = VALID_TRANSITIONS[appointment.status];
    if (!allowed || !allowed.includes(status)) {
      return res.status(400).json({
        message: `Cannot transition from '${appointment.status}' to '${status}'`,
        isOk: false,
        status: 400,
      });
    }

    // ── Date-based status validation (moderate enforcement) ──
    const appointmentDay = new Date(appointment.appointmentDate);
    appointmentDay.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isFuture = appointmentDay.getTime() > today.getTime();
    const isToday = appointmentDay.getTime() === today.getTime();
    const isPast = appointmentDay.getTime() < today.getTime();

    // arrived / in_consultation → only allowed on appointment date (today)
    if (["arrived", "in_consultation"].includes(status)) {
      if (isFuture) {
        return res.status(400).json({
          message: `Cannot mark as ${status.replace(/_/g, " ")} — appointment is scheduled for a future date`,
          isOk: false,
          status: 400,
        });
      }
      if (isPast) {
        return res.status(400).json({
          message: `Cannot mark as ${status.replace(/_/g, " ")} — appointment date has passed`,
          isOk: false,
          status: 400,
        });
      }
    }

    // completed / checked_out → allowed on today or past dates (backdating OK), block future
    if (["completed", "checked_out"].includes(status) && isFuture) {
      return res.status(400).json({
        message: `Cannot mark as ${status.replace(/_/g, " ")} — appointment is scheduled for a future date`,
        isOk: false,
        status: 400,
      });
    }

    // confirmed → allowed on today or future dates only
    if (status === "confirmed" && isPast) {
      return res.status(400).json({
        message: "Cannot confirm — appointment date has already passed",
        isOk: false,
        status: 400,
      });
    }

    if (status === "cancelled") {
      if (!cancellationReasonId) {
        return res.status(400).json({
          message: "Cancellation reason is required",
          isOk: false,
          status: 400,
        });
      }
      appointment.cancellationReasonId = cancellationReasonId;
      appointment.cancellationNotes = cancellationNotes || "";
      appointment.cancelledBy = req.user?.id;
      appointment.cancelledAt = new Date();
    }

    if (status === "completed") {
      const hasClinical =
        (appointment.diagnosis && appointment.diagnosis.length > 0) ||
        (appointment.procedures && appointment.procedures.length > 0) ||
        (appointment.clinicalNotes && appointment.clinicalNotes.length > 0);
      if (!hasClinical) {
        return res.status(400).json({
          message: "At least one diagnosis, procedure, or clinical note is required to complete",
          isOk: false,
          status: 400,
        });
      }
    }

    if (status === "checked_out" && appointment.nextAppointmentDate) {
      appointment.followUpStatus = "pending";
    }

    appointment.status = status;
    appointment.updatedBy = req.user?.id;
    await appointment.save();

    return res.status(200).json({
      message: `Appointment status updated to '${status}'`,
      isOk: true,
      status: 200,
    });
  } catch (error) {
    console.error("Error in updateAppointmentStatus:", error);
    return res.status(500).json({
      message: "Internal server error",
      isOk: false,
      status: 500,
    });
  }
};

export const getAppointmentById = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const appointment = await Appointment.findById(appointmentId)
      .populate("patientId")
      .populate("doctorId")
      .populate("parentAppointmentId")
      .populate("appointmentTypeId")
      .populate("appointmentSourceId")
      .populate("chiefComplaints")
      .populate("diagnosis.diagnosisId")
      .populate("procedures.procedureId")
      .populate("prescriptions.dosageUnitId")
      .populate("prescriptions.frequencyId")
      .populate("prescriptions.durationUnitId")
      .populate("clinicalNotes.noteTypeId")
      .populate("cancellationReasonId")
      .populate("transferredToDoctorId", "doctorName")
      .populate("nextAppointmentDoctorId", "doctorName");

    if (!appointment) {
      return res.status(400).json({
        message: "Appointment not found",
        isOk: false,
        status: 400,
      });
    }

    if (req.user?.role === "DOCTOR" && String(appointment.doctorId?._id || appointment.doctorId) !== String(req.user.id)) {
      return res.status(403).json({
        message: "Forbidden",
        isOk: false,
        status: 403,
      });
    }

    return res.status(200).json({
      message: "Appointment found",
      data: appointment,
      isOk: true,
      status: 200,
    });
  } catch (error) {
    console.error("Error in getAppointmentById:", error);
    return res.status(500).json({
      message: "Internal server error",
      isOk: false,
      status: 500,
    });
  }
};

export const deleteAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(400).json({
        message: "Appointment not found",
        isOk: false,
        status: 400,
      });
    }

    if (req.user?.role === "DOCTOR" && String(appointment.doctorId) !== String(req.user.id)) {
      return res.status(403).json({
        message: "Forbidden",
        isOk: false,
        status: 403,
      });
    }

    if (["completed", "checked_out", "follow_up_planned"].includes(appointment.status)) {
      return res.status(400).json({
        message: "Cannot delete a completed or checked-out appointment",
        isOk: false,
        status: 400,
      });
    }

    await Appointment.findByIdAndDelete(appointmentId);

    return res.status(200).json({
      message: "Appointment deleted successfully",
      isOk: true,
      status: 200,
    });
  } catch (error) {
    console.error("Error in deleteAppointment:", error);
    return res.status(500).json({
      message: "Internal server error",
      isOk: false,
      status: 500,
    });
  }
};

export const listAppointmentsByParams = async (req, res) => {
  try {
    let { skip, per_page, sorton, sortdir, match, isActive, doctorId, status, dateFrom, dateTo } = req.body;

    let matchCondition = {};
    if (isActive !== undefined && isActive !== null && isActive !== "") {
      matchCondition.isActive = isActive;
    }
    // Use middleware-injected doctorId (enforced for DOCTOR role), fallback to body
    const effectiveDoctorId = req.doctorId || doctorId;
    if (effectiveDoctorId) {
      matchCondition.doctorId = new mongoose.Types.ObjectId(effectiveDoctorId);
    }
    if (status) {
      matchCondition.status = status;
    }
    if (dateFrom || dateTo) {
      matchCondition.appointmentDate = {};
      if (dateFrom) matchCondition.appointmentDate.$gte = new Date(dateFrom);
      if (dateTo) matchCondition.appointmentDate.$lte = new Date(dateTo);
    }

    let query = [
      { $match: matchCondition },
      {
        $lookup: {
          from: "patients",
          localField: "patientId",
          foreignField: "_id",
          as: "patient",
        },
      },
      { $unwind: { path: "$patient", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "doctors",
          localField: "doctorId",
          foreignField: "_id",
          as: "doctor",
        },
      },
      { $unwind: { path: "$doctor", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "masterdatas",
          localField: "appointmentTypeId",
          foreignField: "_id",
          as: "appointmentType",
        },
      },
      { $unwind: { path: "$appointmentType", preserveNullAndEmptyArrays: true } },
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
      let searchConditions = {
        $or: [
          { "patient.firstName": { $regex: match, $options: "i" } },
          { "patient.lastName": { $regex: match, $options: "i" } },
          { "patient.patientId": { $regex: match, $options: "i" } },
          { "patient.mobileNumber": { $regex: match, $options: "i" } },
          { "doctor.doctorName": { $regex: match, $options: "i" } },
          { startTime: { $regex: match, $options: "i" } },
        ],
      };
      query.splice(5, 0, { $match: searchConditions });
    }

    if (sorton && sortdir) {
      let sort = {};
      sort[sorton] = sortdir === "desc" ? -1 : 1;
      query = [{ $sort: sort }].concat(query);
    } else {
      query = [{ $sort: { appointmentDate: -1, startTime: -1 } }].concat(query);
    }

    const list = await Appointment.aggregate(query);

    return res.status(200).json({
      isOk: true,
      data: list,
      status: 200,
    });
  } catch (error) {
    console.error("Error in listAppointmentsByParams:", error);
    return res.status(500).json({
      isOk: false,
      message: error.message,
      status: 500,
    });
  }
};

export const getTodaysAppointments = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let matchCondition = {
      appointmentDate: { $gte: today, $lt: tomorrow },
      status: { $nin: ["cancelled", "rescheduled"] },
    };
    // Use middleware-injected doctorId (enforced for DOCTOR role), fallback to query
    const effectiveDoctorId = req.doctorId || req.query.doctorId;
    if (effectiveDoctorId) {
      matchCondition.doctorId = new mongoose.Types.ObjectId(effectiveDoctorId);
    }

    const appointments = await Appointment.find(matchCondition)
      .populate("patientId", "patientId firstName lastName mobileNumber")
      .populate("doctorId", "doctorName doctorCode")
      .populate("appointmentTypeId", "label")
      .sort({ startTime: 1 });

    return res.status(200).json({
      isOk: true,
      data: appointments,
      status: 200,
    });
  } catch (error) {
    console.error("Error in getTodaysAppointments:", error);
    return res.status(500).json({
      isOk: false,
      message: error.message,
      status: 500,
    });
  }
};

export const getFollowUpQueue = async (req, res) => {
  try {
    const followUpQuery = {
      nextAppointmentDate: { $ne: null },
      followUpStatus: { $in: ["pending", null] },
      status: { $in: ["checked_out", "follow_up_planned"] },
    };
    // Use middleware-injected doctorId (enforced for DOCTOR role)
    const effectiveDoctorId = req.doctorId || req.query.doctorId;
    if (effectiveDoctorId) {
      followUpQuery.doctorId = new mongoose.Types.ObjectId(effectiveDoctorId);
    }
    const appointments = await Appointment.find(followUpQuery)
      .populate("patientId", "patientId firstName lastName mobileNumber")
      .populate("doctorId", "doctorName doctorCode")
      .sort({ nextAppointmentDate: 1 });

    return res.status(200).json({
      isOk: true,
      data: appointments,
      status: 200,
    });
  } catch (error) {
    console.error("Error in getFollowUpQueue:", error);
    return res.status(500).json({
      isOk: false,
      message: error.message,
      status: 500,
    });
  }
};

export const getPatientAppointments = async (req, res) => {
  try {
    const { patientId } = req.params;

    const filter = { patientId };
    if (req.user?.role === "DOCTOR") {
      filter.doctorId = req.user.id;
    }

    const appointments = await Appointment.find(filter)
      .populate("doctorId", "doctorName doctorCode")
      .populate("appointmentTypeId", "label")
      .sort({ appointmentDate: -1 });

    return res.status(200).json({
      isOk: true,
      data: appointments,
      status: 200,
    });
  } catch (error) {
    console.error("Error in getPatientAppointments:", error);
    return res.status(500).json({
      isOk: false,
      message: error.message,
      status: 500,
    });
  }
};

export const getDoctorSlots = async (req, res) => {
  try {
    const { doctorId, date } = req.query;

    if (!doctorId || !date) {
      return res.status(400).json({
        message: "doctorId and date are required",
        isOk: false,
        status: 400,
      });
    }

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const booked = await Appointment.find({
      doctorId: new mongoose.Types.ObjectId(doctorId),
      appointmentDate: { $gte: dayStart, $lt: dayEnd },
      status: { $nin: ["cancelled", "no_show", "rescheduled"] },
    }).select("startTime endTime status");

    return res.status(200).json({
      isOk: true,
      data: booked,
      status: 200,
    });
  } catch (error) {
    console.error("Error in getDoctorSlots:", error);
    return res.status(500).json({
      isOk: false,
      message: error.message,
      status: 500,
    });
  }
};

export const transferAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { newDoctorId, transferReason, newDate, newStartTime } = req.body;

    if (!newDoctorId) {
      return res.status(400).json({
        message: "newDoctorId is required",
        isOk: false,
        status: 400,
      });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(400).json({
        message: "Appointment not found",
        isOk: false,
        status: 400,
      });
    }

    // Only scheduled or confirmed appointments can be transferred
    if (!["scheduled", "confirmed"].includes(appointment.status)) {
      return res.status(400).json({
        message: `Cannot transfer — appointment is in '${appointment.status}' status`,
        isOk: false,
        status: 400,
      });
    }

    // Doctor can only transfer their own appointments
    if (req.user?.role === "DOCTOR" && String(appointment.doctorId) !== String(req.user.id)) {
      return res.status(403).json({
        message: "Forbidden",
        isOk: false,
        status: 403,
      });
    }

    // Cannot transfer to same doctor
    if (String(appointment.doctorId) === String(newDoctorId)) {
      return res.status(400).json({
        message: "Cannot transfer to the same doctor",
        isOk: false,
        status: 400,
      });
    }

    const transferDate = newDate ? new Date(newDate) : appointment.appointmentDate;
    const transferTime = newStartTime || appointment.startTime;

    // Check for conflicts on the new doctor's schedule
    const conflict = await Appointment.findOne({
      doctorId: newDoctorId,
      appointmentDate: transferDate,
      startTime: transferTime,
      status: { $nin: ["cancelled", "no_show", "rescheduled"] },
    });

    if (conflict) {
      return res.status(400).json({
        message: "The new doctor already has an appointment at this time slot",
        isOk: false,
        status: 400,
      });
    }

    // Create new appointment for the new doctor
    const newAppointment = new Appointment({
      appointmentDate: transferDate,
      startTime: transferTime,
      endTime: appointment.endTime,
      slotDuration: appointment.slotDuration,
      patientId: appointment.patientId,
      doctorId: newDoctorId,
      parentAppointmentId: appointment._id,
      appointmentTypeId: appointment.appointmentTypeId,
      appointmentSourceId: appointment.appointmentSourceId,
      chiefComplaints: appointment.chiefComplaints,
      isEmergency: appointment.isEmergency,
      status: "scheduled",
      createdBy: req.user?.id,
    });

    await newAppointment.save();

    // Update original appointment
    appointment.status = "rescheduled";
    appointment.transferredToDoctorId = newDoctorId;
    appointment.transferReason = transferReason || "";
    appointment.transferredAt = new Date();
    appointment.updatedBy = req.user?.id;
    await appointment.save();

    return res.status(201).json({
      message: "Appointment transferred successfully",
      isOk: true,
      status: 201,
      data: { _id: newAppointment._id, originalAppointmentId: appointment._id },
    });
  } catch (error) {
    console.error("Error in transferAppointment:", error);
    return res.status(500).json({
      message: "Internal server error",
      isOk: false,
      status: 500,
    });
  }
};
