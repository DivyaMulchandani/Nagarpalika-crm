// Status line under a file picker: progress bar while uploading, a tick when
// done, the reason (with a retry) when it failed.
// state: { status: "uploading" | "done" | "error", pct, message, name }
export default function UploadProgress({ state, onRetry }) {
  if (!state) return null;
  const { status, pct = 0, message, name } = state;

  if (status === "uploading")
    return (
      <div style={{ marginTop: 8 }} aria-live="polite">
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--ojas-ink-3)", marginBottom: 4 }}>
          <span>Uploading{name ? ` ${name}` : ""}… / અપલોડ થઈ રહ્યું છે…</span>
          <strong>{pct}%</strong>
        </div>
        <div style={{ height: 6, background: "#e5e7eb", overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: "var(--ojas-navy)", transition: "width .2s" }} />
        </div>
      </div>
    );

  if (status === "done")
    return (
      <div style={{ marginTop: 6, fontSize: 12.5, color: "#2a7a2a", fontWeight: 600 }} aria-live="polite">
        ✓ Uploaded{name ? `: ${name}` : ""} / અપલોડ થઈ ગયું
      </div>
    );

  if (status === "error")
    return (
      <div style={{ marginTop: 6, fontSize: 12.5, color: "var(--ojas-red)" }} aria-live="polite">
        ✗ {message || "Upload failed."}
        {onRetry && (
          <button type="button" className="btn-link" style={{ marginLeft: 8 }} onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    );

  return null;
}
