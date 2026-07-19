export const APPLICATION_STATUSES = [
  "submitted",
  "under_review",
  "shortlisted",
  "rejected",
  "selected",
];

// Forward-only pipeline; rejected/selected are terminal.
export const ALLOWED_TRANSITIONS = {
  submitted: ["under_review", "rejected"],
  under_review: ["shortlisted", "rejected"],
  shortlisted: ["selected", "rejected"],
  rejected: [],
  selected: [],
};

export const EDITABLE_STATUSES = ["submitted"];
