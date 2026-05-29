// Central react-select styling for Vyaris brand.
// Pass as `styles={vySelectStyles}` on every <Select /> usage.

const vyTokens = {
  ink: "#0A0B0A",
  fg1: "#2B2D28",
  fg2: "#5C5F58",
  fg3: "#8E918A",
  bg0: "#F5F6F2",
  bg1: "#FFFFFF",
  bg2: "#EDEFE8",
  line0: "#E2E5DC",
  line1: "#D2D6CB",
  line2: "#B9BEB1",
  lime: "#1a7a3e",
  limeSoft: "#E7FF96",
  limeDeep: "#145c2e",
};

export const vySelectStyles = {
  control: (base, state) => ({
    ...base,
    background: vyTokens.bg1,
    borderColor: state.isFocused ? vyTokens.lime : vyTokens.line1,
    borderRadius: 8,
    minHeight: 40,
    boxShadow: state.isFocused ? `0 0 0 3px rgba(200, 255, 61, 0.25)` : "none",
    fontFamily: "Manrope, sans-serif",
    fontSize: 14,
    transition: "border-color 120ms ease, box-shadow 120ms ease",
    "&:hover": {
      borderColor: state.isFocused ? vyTokens.lime : vyTokens.line2,
    },
  }),
  valueContainer: (base) => ({ ...base, padding: "2px 12px" }),
  input: (base) => ({ ...base, color: vyTokens.ink, margin: 0, padding: 0 }),
  placeholder: (base) => ({ ...base, color: vyTokens.fg3 }),
  singleValue: (base) => ({ ...base, color: vyTokens.ink }),
  indicatorSeparator: () => ({ display: "none" }),
  dropdownIndicator: (base, state) => ({
    ...base,
    color: state.isFocused ? vyTokens.ink : vyTokens.fg2,
    "&:hover": { color: vyTokens.ink },
  }),
  clearIndicator: (base) => ({
    ...base,
    color: vyTokens.fg2,
    "&:hover": { color: vyTokens.ink },
  }),
  menu: (base) => ({
    ...base,
    background: vyTokens.bg1,
    border: `1px solid ${vyTokens.line1}`,
    borderRadius: 8,
    boxShadow: "0 8px 24px rgba(10, 11, 10, 0.08)",
    overflow: "hidden",
    marginTop: 4,
  }),
  menuList: (base) => ({ ...base, padding: 4 }),
  option: (base, state) => ({
    ...base,
    fontFamily: "Manrope, sans-serif",
    fontSize: 14,
    padding: "8px 12px",
    borderRadius: 6,
    background: state.isSelected
      ? vyTokens.bg2
      : state.isFocused
      ? vyTokens.bg2
      : "transparent",
    color: vyTokens.ink,
    fontWeight: state.isSelected ? 600 : 400,
    cursor: "pointer",
    borderLeft: state.isSelected ? `2px solid ${vyTokens.lime}` : "2px solid transparent",
    "&:active": { background: vyTokens.bg2 },
  }),
  multiValue: (base) => ({
    ...base,
    background: vyTokens.bg2,
    border: `1px solid ${vyTokens.line0}`,
    borderRadius: 4,
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: vyTokens.ink,
    fontFamily: "Manrope, sans-serif",
    fontSize: 13,
    fontWeight: 500,
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: vyTokens.fg2,
    "&:hover": { background: vyTokens.line0, color: vyTokens.ink },
  }),
  groupHeading: (base) => ({
    ...base,
    fontFamily: "Barlow, sans-serif",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: vyTokens.fg2,
    padding: "8px 12px",
  }),
  noOptionsMessage: (base) => ({ ...base, color: vyTokens.fg2, fontFamily: "Manrope, sans-serif" }),
};

export default vySelectStyles;
