import React, { useEffect, useState } from "react";
import { Col } from "reactstrap";
import { resolveDisplayUrl } from "../../utils/fileUrl";

const isPdfPath = (value) => /\.pdf$/i.test(value || "");

export default function StoredFileViewer({ label, path, url, maxWidth = 120 }) {
  const [displayUrl, setDisplayUrl] = useState(url || null);
  const [loading, setLoading] = useState(!url && !!path);

  useEffect(() => {
    let active = true;
    setLoading(!url && !!path);
    resolveDisplayUrl({ url, path })
      .then((resolved) => { if (active) setDisplayUrl(resolved); })
      .catch(() => { if (active) setDisplayUrl(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [path, url]);

  const pdf = isPdfPath(path) || isPdfPath(url);

  return (
    <Col md={3} className="mb-3">
      <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>{label}</div>
      {!path && !url ? (
        <span className="text-muted">Not uploaded</span>
      ) : loading ? (
        <div style={{ width: maxWidth, height: maxWidth, border: "1px solid #ddd", borderRadius: 4, background: "#fafafa", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 11, color: "#999" }}>Loading…</span>
        </div>
      ) : !displayUrl ? (
        <span className="text-muted">Unavailable</span>
      ) : pdf ? (
        <>
          <a href={displayUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-primary" style={{ fontSize: 11 }}>View PDF</a>
        </>
      ) : (
        <a href={displayUrl} target="_blank" rel="noreferrer">
          <img src={displayUrl} alt={label} style={{ maxWidth, border: "1px solid #ddd", borderRadius: 4, display: "block" }} />
        </a>
      )}
    </Col>
  );
}
