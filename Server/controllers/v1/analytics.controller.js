import Advertisement from "../../models/Advertisement.js";
import Candidate from "../../models/Candidate.js";
import Application from "../../models/Application.js";
import FeePayment from "../../models/FeePayment.js";

export const getDashboardStats = async (req, res) => {
  try {
    const [advStats, candidateCount, appStats, feeStats] = await Promise.all([
      Advertisement.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Candidate.countDocuments(),
      Application.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      FeePayment.aggregate([
        {
          $group: {
            _id: "$status",
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const toMap = (arr) =>
      arr.reduce((m, e) => {
        m[e._id] = e;
        return m;
      }, {});
    const advMap = toMap(advStats);
    const appMap = toMap(appStats);
    const feeMap = toMap(feeStats);

    return res.status(200).json({
      isOk: true,
      status: 200,
      data: {
        advertisements: {
          draft: advMap.Draft?.count || 0,
          published: advMap.Published?.count || 0,
          closed: advMap.Closed?.count || 0,
          archived: advMap.Archived?.count || 0,
        },
        candidates: { total: candidateCount },
        applications: {
          submitted: appMap.submitted?.count || 0,
          under_review: appMap.under_review?.count || 0,
          shortlisted: appMap.shortlisted?.count || 0,
          rejected: appMap.rejected?.count || 0,
          selected: appMap.selected?.count || 0,
        },
        feePayments: {
          pending: {
            count: feeMap.pending?.count || 0,
            amount: feeMap.pending?.total || 0,
          },
          paid: {
            count: feeMap.paid?.count || 0,
            amount: feeMap.paid?.total || 0,
          },
          failed: {
            count: feeMap.failed?.count || 0,
            amount: feeMap.failed?.total || 0,
          },
          refunded: {
            count: feeMap.refunded?.count || 0,
            amount: feeMap.refunded?.total || 0,
          },
        },
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};
