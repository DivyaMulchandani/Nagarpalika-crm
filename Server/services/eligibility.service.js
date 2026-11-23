import Qualification from "../models/Qualification.js";

// Groups an advertisement can give age relaxation to, and how a candidate
// record says they belong to one.
export const RELAXATION_GROUPS = {
  SC: { label: "SC", applies: (c) => c.category === "SC" },
  ST: { label: "ST", applies: (c) => c.category === "ST" },
  OBC: { label: "SEBC / OBC", applies: (c) => c.category === "OBC" },
  EWS: { label: "EWS", applies: (c) => c.category === "EWS" },
  Female: { label: "Women", applies: (c) => c.gender === "Female" },
  PH: { label: "Persons with disability (PH)", applies: (c) => !!c.ph_status },
  ExServiceman: { label: "Ex-servicemen", applies: (c) => !!c.ex_serviceman },
};

/** Clean the age_relaxation block sent by the advertisement form. */
export const sanitizeAgeRelaxation = (v) => {
  if (!v || typeof v !== "object") return { enabled: false, rules: [], combine: "add" };
  const seen = new Set();
  const rules = (Array.isArray(v.rules) ? v.rules : [])
    .filter((r) => r && RELAXATION_GROUPS[r.group] && !seen.has(r.group) && seen.add(r.group))
    .map((r) => ({ group: r.group, years: Math.max(0, Math.min(30, Math.floor(Number(r.years) || 0))) }))
    .filter((r) => r.years > 0);
  const cap = Number(v.max_age_cap);
  return {
    enabled: !!v.enabled,
    rules,
    combine: v.combine === "highest" ? "highest" : "add",
    max_age_cap: Number.isFinite(cap) && cap > 0 ? Math.floor(cap) : undefined,
    notes: typeof v.notes === "string" ? v.notes.replace(/[<>]/g, "").trim().slice(0, 1000) : undefined,
  };
};

/** Completed years between two dates, using calendar dates (no time of day). */
export const completedYears = (dob, onDate) => {
  const a = new Date(dob);
  const b = new Date(onDate);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  let years = b.getUTCFullYear() - a.getUTCFullYear();
  const beforeBirthday =
    b.getUTCMonth() < a.getUTCMonth() ||
    (b.getUTCMonth() === a.getUTCMonth() && b.getUTCDate() < a.getUTCDate());
  if (beforeBirthday) years -= 1;
  return years;
};

/** Years of relaxation this candidate gets on this advertisement. */
export const relaxationFor = (advt, candidate) => {
  const r = advt?.age_relaxation;
  if (!r?.enabled || !Array.isArray(r.rules)) return { years: 0, groups: [] };
  const hits = r.rules.filter((rule) => RELAXATION_GROUPS[rule.group]?.applies(candidate || {}));
  if (!hits.length) return { years: 0, groups: [] };
  const years =
    r.combine === "highest"
      ? Math.max(...hits.map((h) => h.years || 0))
      : hits.reduce((sum, h) => sum + (h.years || 0), 0);
  return { years, groups: hits.map((h) => RELAXATION_GROUPS[h.group].label) };
};

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });

/**
 * Check a candidate against an advertisement's age and education rules.
 * `advt.min_education` may be an id or a populated { name, level } entry.
 * Returns { eligible, reasons: [..], details: {..} } — reasons are written
 * for the candidate.
 */
export const checkEligibility = async (advt, candidate) => {
  const reasons = [];
  const details = {};

  // ── Age, as on the last date of application ──
  const minAge = advt?.age_limit?.min;
  const maxAge = advt?.age_limit?.max;
  if ((minAge || maxAge) && advt?.end_date) {
    details.cutoff_date = advt.end_date;
    const age = candidate?.dob ? completedYears(candidate.dob, advt.end_date) : null;
    if (age === null) {
      reasons.push("Your date of birth is missing in your OTR profile, so your age cannot be checked.");
    } else {
      details.age_on_cutoff = age;
      if (minAge) {
        details.min_age = minAge;
        if (age < minAge)
          reasons.push(`Minimum age is ${minAge} years as on ${fmtDate(advt.end_date)}; your age on that date is ${age}.`);
      }
      if (maxAge) {
        const relax = relaxationFor(advt, candidate);
        let allowed = maxAge + relax.years;
        const cap = advt.age_relaxation?.max_age_cap;
        if (relax.years > 0 && cap) allowed = Math.max(maxAge, Math.min(allowed, cap));
        details.max_age_allowed = allowed;
        details.relaxation_years = allowed - maxAge;
        details.relaxation_groups = relax.groups;
        if (age > allowed)
          reasons.push(
            `Maximum age is ${allowed} years as on ${fmtDate(advt.end_date)}` +
              (allowed > maxAge ? ` (${maxAge} + ${allowed - maxAge} years relaxation)` : "") +
              `; your age on that date is ${age}.`,
          );
      }
    }
  }

  // ── Education level ──
  if (advt?.min_education) {
    const required =
      typeof advt.min_education === "object" && advt.min_education.name
        ? advt.min_education
        : await Qualification.findById(advt.min_education).select("name level").lean();
    if (required && typeof required.level === "number") {
      details.required_education = required.name;
      details.required_level = required.level;
      const names = [candidate?.qualification, candidate?.qualification_equivalent].filter(Boolean);
      const own = names.length
        ? await Qualification.find({ name: { $in: names }, type: "education" }).select("name level").lean()
        : [];
      const exact = own.find((q) => q.name === candidate?.qualification && typeof q.level === "number");
      const equiv = own.find((q) => q.name === candidate?.qualification_equivalent && typeof q.level === "number");
      const mine = exact || equiv;
      details.education = candidate?.qualification || "";
      if (!mine) {
        reasons.push(
          `This post requires ${required.name} or higher. Your highest qualification in your OTR profile ("${candidate?.qualification || "not given"}") could not be matched — please update your profile.`,
        );
      } else {
        details.education_level = mine.level;
        if (mine.level < required.level)
          reasons.push(
            `This post requires ${required.name} or higher; your highest qualification is ${candidate.qualification}.`,
          );
      }
    }
  }

  return { eligible: reasons.length === 0, reasons, details };
};
