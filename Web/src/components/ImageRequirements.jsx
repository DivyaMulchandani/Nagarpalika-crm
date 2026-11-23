import { kbRange } from "../utils/candidateImage";

// The photo/signature rules, shown wherever one is uploaded. Values come from
// the same spec the upload is checked against, so the screen always matches.
export default function ImageRequirements({ spec, title, compact = false }) {
  const rows = [
    ["File type", "ફાઇલ પ્રકાર", "JPG / PNG"],
    ["File size", "ફાઇલ સાઇઝ", kbRange(spec)],
    ["Width", "પહોળાઈ", `${spec.minWidth}–${spec.maxWidth} px`],
    ["Height", "ઊંચાઈ", `${spec.minHeight}–${spec.maxHeight} px`],
    ["Shape", "આકાર", `${spec.shapeEn} · e.g. ${spec.example}`, spec.shapeGu],
    ["Note", "નોંધ", spec.noteEn, spec.noteGu],
  ];
  const cell = { padding: compact ? "3px 6px" : "5px 8px", borderBottom: "1px solid var(--ojas-line)", verticalAlign: "top" };
  return (
    <div className="notice info" style={{ fontSize: compact ? 11.5 : 12.5, maxWidth: 520 }}>
      {title && <div className="title" style={{ marginBottom: 6 }}>{title}</div>}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          {rows.map(([en, gu, value, valueGu]) => (
            <tr key={en}>
              <td style={{ ...cell, fontWeight: 600, whiteSpace: "nowrap" }}>
                {en} <span style={{ fontFamily: "var(--font-guj)", fontWeight: 400 }}>/ {gu}</span>
              </td>
              <td style={cell}>
                <strong>{value}</strong>
                {valueGu && <div style={{ fontFamily: "var(--font-guj)" }}>{valueGu}</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 6 }}>
        The file is used exactly as you upload it — please resize it yourself before uploading.
        <div style={{ fontFamily: "var(--font-guj)" }}>
          ફાઇલ જેમ અપલોડ કરશો તેમ જ વપરાશે — અપલોડ કરતાં પહેલાં જાતે સાઇઝ ગોઠવો.
        </div>
      </div>
    </div>
  );
}
