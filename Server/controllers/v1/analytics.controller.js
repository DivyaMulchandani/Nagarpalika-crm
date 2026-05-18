import Payment from "../../models/Payment.js";

// ── Dashboard Stats ──────────────────────────────────────────────────────────
// TODO Phase 1: Replace stub with real recruitment stats using new models:
//   - Advertisement (active count, closing soon)
//   - Candidate / OTR (total registered, registered today)
//   - Application (total submitted, pending review)
//   - FeePayment (total collected, pending)
//   - CallLetter (total enabled advts)

export const getDashboardStats = async (req, res) => {
  res.json({
    isOk: true,
    data: {
      message: "Recruitment dashboard — analytics coming in Phase 1",
      stats: {
        activeAdvertisements: 0,
        totalCandidates: 0,
        totalApplications: 0,
        totalFeesCollected: 0,
      },
    },
  });
};

// TODO Phase 1: Add these exports when recruitment models are ready:
// export const getApplicationsReport  = async (req, res) => { ... };
// export const getCandidatesReport    = async (req, res) => { ... };
// export const getFeeCollectionReport = async (req, res) => { ... };
// export const getCallLetterReport    = async (req, res) => { ... };
