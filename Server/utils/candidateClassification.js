/**
 * Shared normalisation of the free-text candidate fields that drive policy
 * decisions (fee tier, vacancy eligibility).
 *
 * `category` and `gender` are stored as free text, so every consumer has to
 * agree on how to read them. Keeping that in one place is the point — two
 * copies of this logic will drift.
 */

/**
 * Map a free-text category onto one of: general | sc | st | sebc | ews.
 * Anything unrecognised (or blank) is treated as general, which is the
 * non-concessional default.
 *
 * Order and word boundaries both matter here: "scheduled tribe" contains the
 * substring "sc", so a naive substring test for SC swallows ST.
 */
export const normalizeCategory = (category) => {
  if (!category) return "general";
  const c = String(category).toLowerCase().trim();

  if (/\bst\b|scheduled\s*tribe/.test(c)) return "st";
  if (/\bsc\b|scheduled\s*caste/.test(c)) return "sc";
  if (/\bsebc\b|\bobc\b|baxi|other\s*backward/.test(c)) return "sebc";
  if (/\bews\b|economically\s*weaker/.test(c)) return "ews";
  return "general";
};

/** True only for an explicitly male candidate. Blank or unknown is not male. */
export const isMale = (gender) =>
  /^m/.test(String(gender ?? "").trim().toLowerCase());

/** True only for an explicitly female candidate. */
export const isFemale = (gender) =>
  /^f/.test(String(gender ?? "").trim().toLowerCase());

/** Reserved = anything other than the unreserved/general category. */
export const isReservedCategory = (category) =>
  normalizeCategory(category) !== "general";
