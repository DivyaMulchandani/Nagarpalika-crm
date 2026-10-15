/**
 * Display helper for the two-tier application fee.
 *
 * Mirrors describeFee() in Server/services/feeCalculator.service.js. The pages
 * were showing only `application_fee`, so a reserved-category or non-male
 * candidate was quoted the full amount and then charged the concessional one —
 * the figures disagreed with the payment page for most applicants.
 *
 * An advertisement with no concessional fee configured is a single-fee
 * advertisement and renders exactly as before. The amount actually charged is
 * always resolved server-side at payment time from the stored candidate record;
 * this is presentation only and must never be used to decide what to charge.
 */
const isSet = (v) => v !== undefined && v !== null && v !== "";

const toAmount = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

export const describeFee = (advt, freeLabel = 'Free') => {
  const full = toAmount(advt?.application_fee);
  const hasConcession = isSet(advt?.application_fee_concessional);

  if (!full && !hasConcession) return freeLabel;
  if (!hasConcession) return `₹${full}`;

  const concessional = toAmount(advt.application_fee_concessional);
  if (concessional === full) return `₹${full}`;
  return `₹${full} (₹${concessional} concessional)`;
};
