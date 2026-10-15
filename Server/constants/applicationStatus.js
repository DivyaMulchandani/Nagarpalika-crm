export const APPLICATION_STATUSES = [
  // An application is only in the running once its fee is paid. It is created
  // as pending_payment and promoted to submitted by the payment settlement —
  // the gateway return, the reconciliation sweep, or a manual verification —
  // or immediately at submit when the advertisement carries no fee.
  "pending_payment",
  "submitted",
  "under_review",
  "shortlisted",
  "rejected",
  "selected",
];

// Forward-only pipeline; rejected/selected are terminal.
export const ALLOWED_TRANSITIONS = {
  // Staff may reject an unpaid application but cannot advance it: promotion to
  // submitted is the payment's job, so nobody can wave an application through
  // the fee by hand.
  pending_payment: ["submitted", "rejected"],
  submitted: ["under_review", "rejected"],
  under_review: ["shortlisted", "rejected"],
  shortlisted: ["selected", "rejected"],
  rejected: [],
  selected: [],
};

// A candidate may still correct an application they have not yet paid for.
export const EDITABLE_STATUSES = ["pending_payment", "submitted"];

// Statuses that mean "the fee has not been settled yet".
export const UNPAID_STATUSES = ["pending_payment"];
