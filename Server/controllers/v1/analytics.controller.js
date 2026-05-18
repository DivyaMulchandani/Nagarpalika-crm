import Appointment from "../../models/Appointment.js";
import Patient from "../../models/Patient.js";
import Invoice from "../../models/Invoice.js";
import Payment from "../../models/Payment.js";
import Doctor from "../../models/Doctor.js";
import mongoose from "mongoose";

const { ObjectId } = mongoose.Types;

/** Helper: get start of today (local midnight) */
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfToday = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
};

const startOfWeek = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const startOfMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const startOfLastMonth = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfLastMonth = () => {
  const d = new Date();
  d.setDate(0); // last day of previous month
  d.setHours(23, 59, 59, 999);
  return d;
};

const parseDateRange = (query, defaultDays = 30) => {
  const dateTo = query.dateTo ? new Date(query.dateTo + "T23:59:59.999Z") : new Date();
  const dateFrom = query.dateFrom
    ? new Date(query.dateFrom + "T00:00:00.000Z")
    : new Date(dateTo.getTime() - defaultDays * 24 * 60 * 60 * 1000);
  return { dateFrom, dateTo };
};

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// ============================================================
// 1. Dashboard Stats
// ============================================================
export const getDashboardStats = async (req, res) => {
  try {
    const today = startOfToday();
    const todayEnd = endOfToday();

    // Run all queries in parallel
    const [
      todayApptAgg,
      patientsThisWeek,
      patientsThisMonth,
      revenueThisMonthAgg,
      revenueLastMonthAgg,
      pendingInvoicesAgg,
      followUpsPending,
      upcomingBirthdays,
    ] = await Promise.all([
      // Today's appointments by status
      Appointment.aggregate([
        { $match: { appointmentDate: { $gte: today, $lte: todayEnd }, isActive: { $ne: false } } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),

      // Patients this week
      Patient.countDocuments({ createdAt: { $gte: startOfWeek() }, isActive: { $ne: false }, isDeleted: { $ne: true } }),

      // Patients this month
      Patient.countDocuments({ createdAt: { $gte: startOfMonth() }, isActive: { $ne: false }, isDeleted: { $ne: true } }),

      // Revenue this month
      Payment.aggregate([
        { $match: { paymentDate: { $gte: startOfMonth() }, isActive: { $ne: false } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),

      // Revenue last month
      Payment.aggregate([
        { $match: { paymentDate: { $gte: startOfLastMonth(), $lte: endOfLastMonth() }, isActive: { $ne: false } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),

      // Pending invoices
      Invoice.aggregate([
        { $match: { status: { $in: ["issued", "partially_paid", "overdue"] }, isActive: { $ne: false } } },
        { $group: { _id: null, count: { $sum: 1 }, totalAmount: { $sum: "$balanceAmount" } } },
      ]),

      // Follow-ups pending
      Appointment.countDocuments({ followUpStatus: "pending", isActive: { $ne: false } }),

      // Upcoming birthdays (next 7 days)
      (() => {
        const now = new Date();
        const dates = [];
        for (let i = 0; i <= 7; i++) {
          const d = new Date(now);
          d.setDate(d.getDate() + i);
          dates.push({ month: d.getMonth() + 1, day: d.getDate() });
        }
        return Patient.aggregate([
          { $match: { dateOfBirth: { $ne: null }, isActive: { $ne: false }, isDeleted: { $ne: true } } },
          {
            $addFields: {
              dobMonth: { $month: "$dateOfBirth" },
              dobDay: { $dayOfMonth: "$dateOfBirth" },
            },
          },
          {
            $match: {
              $or: dates.map((d) => ({ dobMonth: d.month, dobDay: d.day })),
            },
          },
          { $project: { firstName: 1, lastName: 1, mobileNumber: 1, dateOfBirth: 1 } },
          { $limit: 20 },
        ]);
      })(),
    ]);

    // Build today's appointments by status
    const byStatus = {};
    let totalToday = 0;
    todayApptAgg.forEach((r) => {
      byStatus[r._id] = r.count;
      totalToday += r.count;
    });

    const data = {
      todaysAppointments: { total: totalToday, byStatus },
      patientsThisWeek,
      patientsThisMonth,
      revenueThisMonth: revenueThisMonthAgg[0]?.total || 0,
      revenueLastMonth: revenueLastMonthAgg[0]?.total || 0,
      pendingPayments: {
        count: pendingInvoicesAgg[0]?.count || 0,
        totalAmount: pendingInvoicesAgg[0]?.totalAmount || 0,
      },
      followUpsPending,
      upcomingBirthdays,
    };

    return res.status(200).json({ isOk: true, data, status: 200 });
  } catch (err) {
    console.error("getDashboardStats error:", err);
    return res.status(500).json({ isOk: false, message: err.message, status: 500 });
  }
};

// ============================================================
// 2. Appointment Summary Report
// ============================================================
export const getAppointmentSummaryReport = async (req, res) => {
  try {
    const { dateFrom, dateTo } = parseDateRange(req.query);
    const matchCondition = {
      appointmentDate: { $gte: dateFrom, $lte: dateTo },
      isActive: { $ne: false },
    };
    // Use middleware-injected doctorId (enforced for DOCTOR role), fallback to query
    const effectiveDoctorId = req.doctorId || req.query.doctorId;
    if (effectiveDoctorId) matchCondition.doctorId = new ObjectId(effectiveDoctorId);

    const [statusAgg, doctorAgg, dayOfWeekAgg, sourceAgg, typeAgg] = await Promise.all([
      // Total by status
      Appointment.aggregate([
        { $match: matchCondition },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),

      // By doctor
      Appointment.aggregate([
        { $match: matchCondition },
        {
          $group: {
            _id: "$doctorId",
            total: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
            cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
            noShow: { $sum: { $cond: [{ $eq: ["$status", "no_show"] }, 1, 0] } },
          },
        },
        { $lookup: { from: "doctors", localField: "_id", foreignField: "_id", as: "doc" } },
        { $unwind: { path: "$doc", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            doctorId: "$_id",
            doctorName: "$doc.doctorName",
            total: 1, completed: 1, cancelled: 1, noShow: 1,
          },
        },
        { $sort: { total: -1 } },
      ]),

      // By day of week
      Appointment.aggregate([
        { $match: matchCondition },
        { $group: { _id: { $dayOfWeek: "$appointmentDate" }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),

      // By source
      Appointment.aggregate([
        { $match: matchCondition },
        { $lookup: { from: "masterdatas", localField: "appointmentSourceId", foreignField: "_id", as: "src" } },
        { $unwind: { path: "$src", preserveNullAndEmptyArrays: true } },
        { $group: { _id: "$src.label", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // By type
      Appointment.aggregate([
        { $match: matchCondition },
        { $lookup: { from: "masterdatas", localField: "appointmentTypeId", foreignField: "_id", as: "typ" } },
        { $unwind: { path: "$typ", preserveNullAndEmptyArrays: true } },
        { $group: { _id: "$typ.label", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    const totalByStatus = {};
    statusAgg.forEach((r) => { totalByStatus[r._id] = r.count; });

    const byDayOfWeek = dayOfWeekAgg.map((r) => ({
      day: dayNames[r._id - 1] || `Day ${r._id}`,
      count: r.count,
    }));

    const data = {
      totalByStatus,
      byDoctor: doctorAgg,
      byDayOfWeek,
      bySource: sourceAgg.map((s) => ({ source: s._id || "Unknown", count: s.count })),
      byType: typeAgg.map((t) => ({ type: t._id || "Unknown", count: t.count })),
    };

    return res.status(200).json({ isOk: true, data, status: 200 });
  } catch (err) {
    console.error("getAppointmentSummaryReport error:", err);
    return res.status(500).json({ isOk: false, message: err.message, status: 500 });
  }
};

// ============================================================
// 3. Revenue Report
// ============================================================
export const getRevenueReport = async (req, res) => {
  try {
    const { dateFrom, dateTo } = parseDateRange(req.query);

    const paymentMatch = {
      paymentDate: { $gte: dateFrom, $lte: dateTo },
      isActive: { $ne: false },
    };

    const [totalCollectedAgg, outstandingAgg, byMethodAgg, byDoctorAgg, dailyAgg] = await Promise.all([
      // Total collected
      Payment.aggregate([
        { $match: paymentMatch },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),

      // Total outstanding
      Invoice.aggregate([
        { $match: { status: { $in: ["issued", "partially_paid", "overdue"] }, isActive: { $ne: false } } },
        { $group: { _id: null, total: { $sum: "$balanceAmount" } } },
      ]),

      // By payment method
      Payment.aggregate([
        { $match: paymentMatch },
        { $lookup: { from: "masterdatas", localField: "paymentMethodId", foreignField: "_id", as: "method" } },
        { $unwind: { path: "$method", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: "$method.label",
            amount: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { amount: -1 } },
      ]),

      // By doctor (via invoice → appointment → doctor)
      Invoice.aggregate([
        { $match: { createdAt: { $gte: dateFrom, $lte: dateTo }, isActive: { $ne: false } } },
        { $lookup: { from: "appointments", localField: "appointmentId", foreignField: "_id", as: "appt" } },
        { $unwind: { path: "$appt", preserveNullAndEmptyArrays: true } },
        { $lookup: { from: "doctors", localField: "appt.doctorId", foreignField: "_id", as: "doc" } },
        { $unwind: { path: "$doc", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: "$doc._id",
            doctorName: { $first: "$doc.doctorName" },
            revenue: { $sum: "$grandTotal" },
            invoiceCount: { $sum: 1 },
          },
        },
        { $sort: { revenue: -1 } },
      ]),

      // Daily revenue
      Payment.aggregate([
        { $match: paymentMatch },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$paymentDate" } },
            amount: { $sum: "$amount" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const data = {
      totalCollected: totalCollectedAgg[0]?.total || 0,
      totalOutstanding: outstandingAgg[0]?.total || 0,
      byPaymentMethod: byMethodAgg.map((m) => ({ method: m._id || "Unknown", amount: m.amount, count: m.count })),
      byDoctor: byDoctorAgg.map((d) => ({ doctorId: d._id, doctorName: d.doctorName || "Unknown", revenue: d.revenue, invoiceCount: d.invoiceCount })),
      dailyRevenue: dailyAgg.map((d) => ({ date: d._id, amount: d.amount })),
    };

    return res.status(200).json({ isOk: true, data, status: 200 });
  } catch (err) {
    console.error("getRevenueReport error:", err);
    return res.status(500).json({ isOk: false, message: err.message, status: 500 });
  }
};

// ============================================================
// 4. Patient Report
// ============================================================
export const getPatientReport = async (req, res) => {
  try {
    const { dateFrom, dateTo } = parseDateRange(req.query);
    const match = { createdAt: { $gte: dateFrom, $lte: dateTo }, isActive: { $ne: false }, isDeleted: { $ne: true } };

    const [countResult, byReferral, trendAgg] = await Promise.all([
      Patient.countDocuments(match),

      Patient.aggregate([
        { $match: match },
        { $group: { _id: "$referralSource", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      Patient.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const data = {
      newRegistrations: countResult,
      byReferralSource: byReferral.map((r) => ({ source: r._id || "Not specified", count: r.count })),
      registrationTrend: trendAgg.map((t) => ({ date: t._id, count: t.count })),
    };

    return res.status(200).json({ isOk: true, data, status: 200 });
  } catch (err) {
    console.error("getPatientReport error:", err);
    return res.status(500).json({ isOk: false, message: err.message, status: 500 });
  }
};

// ============================================================
// 5. Follow-Up Report
// ============================================================
export const getFollowUpReport = async (req, res) => {
  try {
    const { dateFrom, dateTo } = parseDateRange(req.query);
    const match = {
      nextAppointmentDate: { $exists: true, $ne: null },
      appointmentDate: { $gte: dateFrom, $lte: dateTo },
      isActive: { $ne: false },
    };
    // Use middleware-injected doctorId (enforced for DOCTOR role), fallback to query
    const effectiveDoctorId = req.doctorId || req.query.doctorId;
    if (effectiveDoctorId) match.doctorId = new ObjectId(effectiveDoctorId);

    const [statusAgg, byDoctorAgg] = await Promise.all([
      Appointment.aggregate([
        { $match: match },
        { $group: { _id: "$followUpStatus", count: { $sum: 1 } } },
      ]),

      Appointment.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$doctorId",
            suggested: { $sum: 1 },
            confirmed: { $sum: { $cond: [{ $eq: ["$followUpStatus", "confirmed"] }, 1, 0] } },
            completed: { $sum: { $cond: [{ $eq: ["$followUpStatus", "completed"] }, 1, 0] } },
          },
        },
        { $lookup: { from: "doctors", localField: "_id", foreignField: "_id", as: "doc" } },
        { $unwind: { path: "$doc", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            doctorId: "$_id",
            doctorName: "$doc.doctorName",
            suggested: 1, confirmed: 1, completed: 1,
          },
        },
        { $sort: { suggested: -1 } },
      ]),
    ]);

    const statusMap = {};
    statusAgg.forEach((r) => { statusMap[r._id] = r.count; });
    const totalSuggested = Object.values(statusMap).reduce((s, v) => s + v, 0);
    const completedCount = statusMap.completed || 0;
    const now = new Date();

    // Count overdue: appointments where nextAppointmentDate < now and followUpStatus is still pending
    const overdue = await Appointment.countDocuments({
      ...match,
      nextAppointmentDate: { $lt: now },
      followUpStatus: "pending",
    });

    const data = {
      totalSuggested,
      confirmed: statusMap.confirmed || 0,
      completed: completedCount,
      overdue,
      cancelled: statusMap.cancelled || 0,
      complianceRate: totalSuggested > 0 ? Number(((completedCount / totalSuggested) * 100).toFixed(1)) : 0,
      byDoctor: byDoctorAgg,
    };

    return res.status(200).json({ isOk: true, data, status: 200 });
  } catch (err) {
    console.error("getFollowUpReport error:", err);
    return res.status(500).json({ isOk: false, message: err.message, status: 500 });
  }
};

// ============================================================
// 6. Doctor Utilization Report
// ============================================================
export const getDoctorUtilizationReport = async (req, res) => {
  try {
    const { dateFrom, dateTo } = parseDateRange(req.query, 7);

    // Number of days in range
    const daysDiff = Math.max(1, Math.ceil((dateTo - dateFrom) / (1000 * 60 * 60 * 24)));
    const slotsPerDay = 24; // 8am-8pm = 12 hours = 24 x 30-min slots

    // Use middleware-injected doctorId (enforced for DOCTOR role), fallback to query
    const effectiveDoctorId = req.doctorId || req.query.doctorId;
    const doctorQuery = { isActive: { $ne: false } };
    if (effectiveDoctorId) doctorQuery._id = new ObjectId(effectiveDoctorId);

    const allDoctors = await Doctor.find(doctorQuery).select("_id doctorName").lean();

    const apptMatch = {
      appointmentDate: { $gte: dateFrom, $lte: dateTo },
      status: { $nin: ["cancelled", "no_show"] },
      isActive: { $ne: false },
    };
    if (effectiveDoctorId) apptMatch.doctorId = new ObjectId(effectiveDoctorId);

    const [apptByDoctor, revenueByDoctor] = await Promise.all([
      Appointment.aggregate([
        { $match: apptMatch },
        {
          $group: {
            _id: "$doctorId",
            occupiedSlots: { $sum: 1 },
          },
        },
      ]),

      Invoice.aggregate([
        { $match: { createdAt: { $gte: dateFrom, $lte: dateTo }, isActive: { $ne: false }, status: { $ne: "cancelled" } } },
        { $lookup: { from: "appointments", localField: "appointmentId", foreignField: "_id", as: "appt" } },
        { $unwind: { path: "$appt", preserveNullAndEmptyArrays: true } },
        { $group: { _id: "$appt.doctorId", totalRevenue: { $sum: "$paidAmount" } } },
      ]),
    ]);

    const apptMap = {};
    apptByDoctor.forEach((a) => { apptMap[a._id?.toString()] = a.occupiedSlots; });

    const revMap = {};
    revenueByDoctor.forEach((r) => { if (r._id) revMap[r._id.toString()] = r.totalRevenue; });

    const totalSlots = slotsPerDay * daysDiff;

    const doctors = allDoctors.map((doc) => {
      const docId = doc._id.toString();
      const occupied = apptMap[docId] || 0;
      return {
        doctorId: doc._id,
        doctorName: doc.doctorName,
        totalSlots,
        occupiedSlots: occupied,
        utilizationPercent: totalSlots > 0 ? (occupied / totalSlots) * 100 : 0,
        avgPatientsPerDay: daysDiff > 0 ? occupied / daysDiff : 0,
        totalRevenue: revMap[docId] || 0,
      };
    });

    return res.status(200).json({ isOk: true, data: { doctors }, status: 200 });
  } catch (err) {
    console.error("getDoctorUtilizationReport error:", err);
    return res.status(500).json({ isOk: false, message: err.message, status: 500 });
  }
};

// ============================================================
// 7. Doctor Dashboard Stats (scoped to logged-in doctor)
// ============================================================
export const getDoctorDashboardStats = async (req, res) => {
  try {
    const doctorId = req.session?.user?.id;
    if (!doctorId) {
      return res.status(401).json({ isOk: false, message: "Unauthorized", status: 401 });
    }
    const docObjId = new ObjectId(doctorId);

    const today = startOfToday();
    const todayEnd = endOfToday();
    const weekStart = startOfWeek();
    const monthStart = startOfMonth();

    const [
      todayAppointments,
      todayStatusAgg,
      weekApptCount,
      monthApptCount,
      completedThisMonth,
      followUpsPending,
      upcomingAppointments,
      recentPatients,
    ] = await Promise.all([
      // Today's appointments list with patient details, sorted by time
      Appointment.find({
        doctorId: docObjId,
        appointmentDate: { $gte: today, $lte: todayEnd },
        status: { $nin: ["cancelled", "rescheduled"] },
      })
        .populate("patientId", "patientId firstName lastName mobileNumber dateOfBirth")
        .populate("appointmentTypeId", "label")
        .sort({ startTime: 1 })
        .lean(),

      // Today's status breakdown
      Appointment.aggregate([
        {
          $match: {
            doctorId: docObjId,
            appointmentDate: { $gte: today, $lte: todayEnd },
            status: { $nin: ["cancelled", "rescheduled"] },
          },
        },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),

      // This week appointment count
      Appointment.countDocuments({
        doctorId: docObjId,
        appointmentDate: { $gte: weekStart },
        status: { $nin: ["cancelled", "rescheduled"] },
      }),

      // This month appointment count
      Appointment.countDocuments({
        doctorId: docObjId,
        appointmentDate: { $gte: monthStart },
        status: { $nin: ["cancelled", "rescheduled"] },
      }),

      // Completed consultations this month
      Appointment.countDocuments({
        doctorId: docObjId,
        appointmentDate: { $gte: monthStart },
        status: { $in: ["completed", "checked_out", "follow_up_planned"] },
      }),

      // Follow-ups pending (prescribed by this doctor)
      Appointment.find({
        doctorId: docObjId,
        nextAppointmentDate: { $ne: null },
        followUpStatus: { $in: ["pending", null] },
        status: { $in: ["checked_out", "follow_up_planned"] },
      })
        .populate("patientId", "patientId firstName lastName mobileNumber")
        .sort({ nextAppointmentDate: 1 })
        .limit(10)
        .lean(),

      // Next 5 upcoming appointments (after now)
      Appointment.find({
        doctorId: docObjId,
        appointmentDate: { $gte: today },
        status: { $in: ["scheduled", "confirmed"] },
        $or: [
          { appointmentDate: { $gt: todayEnd } },
          {
            appointmentDate: { $gte: today, $lte: todayEnd },
            startTime: { $gt: new Date().toTimeString().slice(0, 5) },
          },
        ],
      })
        .populate("patientId", "patientId firstName lastName mobileNumber")
        .populate("appointmentTypeId", "label")
        .sort({ appointmentDate: 1, startTime: 1 })
        .limit(5)
        .lean(),

      // Recent unique patients (last 30 days)
      Appointment.aggregate([
        {
          $match: {
            doctorId: docObjId,
            appointmentDate: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            status: { $in: ["completed", "checked_out", "follow_up_planned"] },
          },
        },
        { $group: { _id: "$patientId" } },
        { $count: "total" },
      ]),
    ]);

    // Build status breakdown
    const statusBreakdown = {};
    let todayTotal = 0;
    todayStatusAgg.forEach((r) => {
      statusBreakdown[r._id] = r.count;
      todayTotal += r.count;
    });

    // Find the current/next appointment
    const now = new Date();
    const nowTime = now.toTimeString().slice(0, 5);
    let currentAppointment = null;
    let nextAppointment = null;

    for (const appt of todayAppointments) {
      if (appt.status === "in_consultation") {
        currentAppointment = appt;
      } else if (
        !nextAppointment &&
        ["scheduled", "confirmed", "arrived"].includes(appt.status) &&
        appt.startTime >= nowTime
      ) {
        nextAppointment = appt;
      }
    }

    const data = {
      today: {
        total: todayTotal,
        appointments: todayAppointments,
        byStatus: statusBreakdown,
        completed: statusBreakdown.completed || 0,
        remaining:
          (statusBreakdown.scheduled || 0) +
          (statusBreakdown.confirmed || 0) +
          (statusBreakdown.arrived || 0),
        inConsultation: statusBreakdown.in_consultation || 0,
      },
      currentAppointment,
      nextAppointment,
      thisWeek: weekApptCount,
      thisMonth: monthApptCount,
      completedThisMonth,
      followUpsPending,
      upcomingAppointments,
      uniquePatientsLast30Days: recentPatients[0]?.total || 0,
    };

    return res.status(200).json({ isOk: true, data, status: 200 });
  } catch (err) {
    console.error("getDoctorDashboardStats error:", err);
    return res.status(500).json({ isOk: false, message: err.message, status: 500 });
  }
};
