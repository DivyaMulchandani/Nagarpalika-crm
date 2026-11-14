/**
 * Has an advertisement's closing date passed?
 *
 * The stored end_date is a calendar day (the admin form saves "2026-10-06" as
 * midnight UTC). It closes at the end of that day in INDIA, whatever timezone
 * the server runs in — on a UTC server, the server's own end of day is 5:30 AM
 * the next morning in India, after the published last date.
 *
 * Shared between the application and fee controllers: both the act of applying
 * and the act of paying have to respect the same closing moment, and two copies
 * of this rule would eventually disagree.
 */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Today's date in India, in the same form as a stored end_date (midnight UTC). */
export const todayInIndia = () => {
  const india = new Date(Date.now() + IST_OFFSET_MS);
  return new Date(
    Date.UTC(india.getUTCFullYear(), india.getUTCMonth(), india.getUTCDate()),
  );
};

export const deadlinePassed = (end_date) => {
  if (!end_date) return false;
  const end = new Date(end_date);
  const lastDay = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  return todayInIndia().getTime() > lastDay;
};

/**
 * Is this advertisement finished with new fee payments? Archiving closes it
 * straight away, even before its last date. This only stops a NEW attempt: a
 * NEFT begun earlier that clears later is still settled.
 */
export const feePaymentClosed = (advt) =>
  advt?.status !== "Published" || deadlinePassed(advt?.end_date);
