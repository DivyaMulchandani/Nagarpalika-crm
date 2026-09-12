/**
 * Application fee resolution.
 *
 * Two tiers: unreserved ("General") male candidates pay the full fee, everyone
 * else pays the concessional fee. Resolution happens here, server-side, from
 * the stored candidate record — never from anything the client sends.
 *
 * An advertisement with no concessional fee configured is a single-fee
 * advertisement and everyone pays `application_fee`, so existing records keep
 * working untouched.
 */
import { normalizeCategory, isMale } from "../utils/candidateClassification.js";

const toAmount = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

const isSet = (v) => v !== undefined && v !== null && v !== "";

/**
 * @param {object} advt      Advertisement (needs application_fee[, _concessional])
 * @param {object} candidate Candidate (needs category, gender)
 * @returns {{amount:number, tier:"general_male"|"concessional",
 *            full:number, concessional:number, hasConcession:boolean,
 *            reason:string}}
 */
export const resolveApplicationFee = (advt, candidate) => {
  const full = toAmount(advt?.application_fee);
  const hasConcession = isSet(advt?.application_fee_concessional);
  const concessional = hasConcession
    ? toAmount(advt.application_fee_concessional)
    : full;

  const category = normalizeCategory(candidate?.category);
  const male = isMale(candidate?.gender);

  // Full fee is the narrow case: it needs BOTH an unreserved category and an
  // explicitly male candidate. Anything else — reserved category, female,
  // other/transgender, or a blank gender — gets the concession.
  const paysFull = category === "general" && male;

  return {
    amount: paysFull ? full : concessional,
    tier: paysFull ? "general_male" : "concessional",
    full,
    concessional,
    hasConcession,
    reason: paysFull
      ? "Unreserved (General) male candidate"
      : category !== "general"
        ? `Reserved category (${category.toUpperCase()})`
        : "Non-male candidate",
  };
};

/** Human-readable fee line for listings, e.g. "₹1500 (₹750 concessional)". */
export const describeFee = (advt) => {
  const full = toAmount(advt?.application_fee);
  if (!full && !isSet(advt?.application_fee_concessional)) return "Free";
  if (!isSet(advt?.application_fee_concessional)) return `₹${full}`;
  const concessional = toAmount(advt.application_fee_concessional);
  if (concessional === full) return `₹${full}`;
  return `₹${full} (₹${concessional} concessional)`;
};
