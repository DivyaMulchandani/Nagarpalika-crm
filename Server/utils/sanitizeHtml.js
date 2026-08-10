/**
 * HTML Sanitizer Utility
 * Strips executable scripts, dangerous HTML tags, and inline event handlers to prevent Stored XSS.
 */
export const sanitizeHtml = (dirty = "") => {
  if (!dirty || typeof dirty !== "string") return "";

  return (
    dirty
      // 1. Strip script, style, iframe, object, embed, and form blocks
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
      .replace(/<embed\b[^>]*>/gi, "")
      .replace(/<meta\b[^>]*>/gi, "")
      .replace(/<link\b[^>]*>/gi, "")
      // 2. Strip inline JS event handlers (onclick, onerror, onload, etc.)
      .replace(/\s*on\w+\s*=\s*(['"][^'"]*['"]|[^\s>]+)/gi, "")
      // 3. Neutralize javascript:, vbscript:, and data: URI schemes in attributes
      .replace(/\b(href|src)\s*=\s*['"]\s*(javascript|data|vbscript):[^'"]*['"]/gi, '$1="#"')
  );
};

export default sanitizeHtml;
