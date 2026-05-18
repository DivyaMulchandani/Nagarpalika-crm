import mongoose from "mongoose";
import Prescription from "../../models/Prescription.js";
import Appointment from "../../models/Appointment.js";

const POPULATE_FIELDS = [
  { path: "appointmentId", select: "appointmentDate startTime endTime status" },
  { path: "patientId", select: "firstName lastName mobileNumber" },
  { path: "doctorId", select: "firstName lastName" },
  { path: "medicines.dosageUnitId", select: "label value" },
  { path: "medicines.frequencyId", select: "label value" },
  { path: "medicines.durationUnitId", select: "label value" },
];

export const createPrescription = async (req, res) => {
  try {
    const { appointmentId, patientId, doctorId, medicines, notes } = req.body;

    if (!appointmentId || !patientId || !doctorId) {
      return res.status(400).json({
        message: "appointmentId, patientId, and doctorId are required",
        isOk: false,
        status: 400,
      });
    }

    if (!medicines || !medicines.length) {
      return res.status(400).json({
        message: "At least one medicine is required",
        isOk: false,
        status: 400,
      });
    }

    // Verify appointment exists
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(400).json({
        message: "Appointment not found",
        isOk: false,
        status: 400,
      });
    }

    const prescription = new Prescription({
      appointmentId,
      patientId,
      doctorId,
      medicines,
      notes: notes || undefined,
      createdBy: req.user?.id,
    });

    await prescription.save();

    return res.status(201).json({
      message: "Prescription created successfully",
      isOk: true,
      status: 201,
      data: { _id: prescription._id },
    });
  } catch (error) {
    console.error("Error in createPrescription:", error);
    return res.status(500).json({
      message: "Internal server error",
      isOk: false,
      status: 500,
    });
  }
};

export const getPrescriptionById = async (req, res) => {
  try {
    const { prescriptionId } = req.params;

    const prescription = await Prescription.findById(prescriptionId)
      .populate(POPULATE_FIELDS);

    if (!prescription) {
      return res.status(400).json({
        message: "Prescription not found",
        isOk: false,
        status: 400,
      });
    }

    return res.status(200).json({
      message: "Prescription fetched successfully",
      isOk: true,
      status: 200,
      data: prescription,
    });
  } catch (error) {
    console.error("Error in getPrescriptionById:", error);
    return res.status(500).json({
      message: "Internal server error",
      isOk: false,
      status: 500,
    });
  }
};

export const getPrescriptionsByAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const prescriptions = await Prescription.find({
      appointmentId,
      isActive: true,
    })
      .populate(POPULATE_FIELDS)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Prescriptions fetched successfully",
      isOk: true,
      status: 200,
      data: prescriptions,
    });
  } catch (error) {
    console.error("Error in getPrescriptionsByAppointment:", error);
    return res.status(500).json({
      message: "Internal server error",
      isOk: false,
      status: 500,
    });
  }
};

export const getPrescriptionsByPatient = async (req, res) => {
  try {
    const { patientId } = req.params;

    const prescriptions = await Prescription.find({
      patientId,
      isActive: true,
    })
      .populate(POPULATE_FIELDS)
      .sort({ prescriptionDate: -1 });

    return res.status(200).json({
      message: "Prescriptions fetched successfully",
      isOk: true,
      status: 200,
      data: prescriptions,
    });
  } catch (error) {
    console.error("Error in getPrescriptionsByPatient:", error);
    return res.status(500).json({
      message: "Internal server error",
      isOk: false,
      status: 500,
    });
  }
};

export const updatePrescription = async (req, res) => {
  try {
    const { prescriptionId } = req.params;
    const { medicines, notes } = req.body;

    const prescription = await Prescription.findById(prescriptionId);
    if (!prescription) {
      return res.status(400).json({
        message: "Prescription not found",
        isOk: false,
        status: 400,
      });
    }

    // Check if appointment is already checked out
    const appointment = await Appointment.findById(prescription.appointmentId);
    if (appointment && appointment.status === "checked_out") {
      return res.status(400).json({
        message: "Cannot update prescription — appointment is already checked out",
        isOk: false,
        status: 400,
      });
    }

    // Doctor can only edit their own prescriptions
    if (req.user?.role === "DOCTOR" && String(prescription.doctorId) !== String(req.user.id)) {
      return res.status(403).json({
        message: "Forbidden",
        isOk: false,
        status: 403,
      });
    }

    if (medicines !== undefined) prescription.medicines = medicines;
    if (notes !== undefined) prescription.notes = notes;
    prescription.updatedBy = req.user?.id;

    await prescription.save();

    return res.status(200).json({
      message: "Prescription updated successfully",
      isOk: true,
      status: 200,
      data: { _id: prescription._id },
    });
  } catch (error) {
    console.error("Error in updatePrescription:", error);
    return res.status(500).json({
      message: "Internal server error",
      isOk: false,
      status: 500,
    });
  }
};

export const deletePrescription = async (req, res) => {
  try {
    const { prescriptionId } = req.params;

    const prescription = await Prescription.findById(prescriptionId);
    if (!prescription) {
      return res.status(400).json({
        message: "Prescription not found",
        isOk: false,
        status: 400,
      });
    }

    // Doctor can only delete their own prescriptions
    if (req.user?.role === "DOCTOR" && String(prescription.doctorId) !== String(req.user.id)) {
      return res.status(403).json({
        message: "Forbidden",
        isOk: false,
        status: 403,
      });
    }

    // Soft delete
    prescription.isActive = false;
    prescription.updatedBy = req.user?.id;
    await prescription.save();

    return res.status(200).json({
      message: "Prescription deleted successfully",
      isOk: true,
      status: 200,
    });
  } catch (error) {
    console.error("Error in deletePrescription:", error);
    return res.status(500).json({
      message: "Internal server error",
      isOk: false,
      status: 500,
    });
  }
};
