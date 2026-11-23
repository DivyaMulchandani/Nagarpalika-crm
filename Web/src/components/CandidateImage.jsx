import { useEffect, useState } from "react";
import { resolveDisplayUrl } from "../utils/fileUrl";
import { PHOTO_SPEC, SIGNATURE_SPEC } from "../utils/candidateImage";

// Fixed-size frame for a candidate photo or signature. `src` is a ready URL
// (e.g. a local preview); otherwise `url` / `path` are resolved like StoredImage.
function CandidateImageBox({ spec, src, url, path, alt, emptyText, caption, scale = 1 }) {
  const [resolved, setResolved] = useState(src || url || null);

  useEffect(() => {
    if (src) { setResolved(src); return; }
    let active = true;
    resolveDisplayUrl({ url, path })
      .then((u) => { if (active) setResolved(u); })
      .catch(() => { if (active) setResolved(null); });
    return () => { active = false; };
  }, [src, url, path]);

  const box = {
    width: Math.round(spec.boxWidth * scale),
    height: Math.round(spec.boxHeight * scale),
    border: "1px solid var(--ojas-line)",
    borderRadius: 4,
    background: "#fff",
    flexShrink: 0,
  };

  return (
    <div style={{ textAlign: "center", flexShrink: 0 }}>
      {resolved ? (
        <img
          src={resolved}
          alt={alt}
          style={{ ...box, display: "block", objectFit: "contain" /* show the whole image, never cut */ }}
        />
      ) : (
        <div style={{ ...box, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 12 }}>
          {emptyText}
        </div>
      )}
      {caption && (
        <div style={{ fontSize: 11, color: "var(--ojas-ink-3)", marginTop: 4, fontWeight: 600 }}>{caption}</div>
      )}
    </div>
  );
}

export function CandidatePhoto(props) {
  return <CandidateImageBox spec={PHOTO_SPEC} alt="Candidate photo" emptyText="No photo" {...props} />;
}

export function CandidateSignature(props) {
  return <CandidateImageBox spec={SIGNATURE_SPEC} alt="Candidate signature" emptyText="No signature" {...props} />;
}
