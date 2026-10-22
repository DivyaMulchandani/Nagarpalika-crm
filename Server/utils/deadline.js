/**
 * Has an advertisement's closing date passed?
 *
 * The stored end_date is a calendar day, so the cut-off is the END of that day
 * — a candidate applying at 9pm on the last day is in time.
 *
 * Shared between the application and fee controllers: both the act of applying
 * and the act of paying have to respect the same closing moment, and two copies
 * of this rule would eventually disagree.
 */
export const deadlinePassed = (end_date) => {
  if (!end_date) return false;
  const deadline = new Date(end_date);
  deadline.setHours(23, 59, 59, 999);
  return new Date() > deadline;
};
