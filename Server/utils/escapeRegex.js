/**
 * escapeRegex — Security Utility
 * Escapes a user-supplied string before using it in a MongoDB $regex query.
 * Prevents ReDoS (Regex Denial of Service) attacks where a malicious regex
 * pattern causes catastrophic backtracking in the MongoDB query engine.
 *
 * Usage:
 *   import { escapeRegex } from "../../utils/escapeRegex.js";
 *   filter.name = { $regex: escapeRegex(match), $options: "i" };
 *
 * @param {string} str - The raw user input string
 * @returns {string} The escaped string safe for use in $regex
 */
export const escapeRegex = (str) =>
  String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
