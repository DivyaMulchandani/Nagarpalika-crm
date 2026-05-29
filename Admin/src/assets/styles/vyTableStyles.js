// Central react-data-table-component customStyles for Vyaris brand.
// Pass as `customStyles={vyTableStyles}` on every <DataTable /> usage.

export const vyTableStyles = {
  table: {
    style: {
      background: "#FFFFFF",
      fontFamily: "Manrope, sans-serif",
    },
  },
  header: {
    style: {
      fontFamily: "Barlow, sans-serif",
      fontSize: 14,
      fontWeight: 600,
      color: "#0A0B0A",
      background: "transparent",
      borderBottom: "1px solid #E2E5DC",
      paddingTop: 12,
      paddingBottom: 12,
    },
  },
  headRow: {
    style: {
      background: "#F5F6F2",
      borderBottom: "1px solid #D2D6CB",
      minHeight: 44,
    },
  },
  headCells: {
    style: {
      fontFamily: "Barlow, sans-serif",
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      color: "#5C5F58",
      paddingLeft: 16,
      paddingRight: 16,
    },
  },
  rows: {
    style: {
      fontFamily: "Manrope, sans-serif",
      fontSize: 14,
      color: "#2B2D28",
      minHeight: 48,
      borderBottom: "1px solid #E2E5DC !important",
      "&:hover": { background: "#EDEFE8" },
    },
    stripedStyle: { background: "#FAFBF7" },
    selectedHighlightStyle: {
      borderLeft: "2px solid #1a7a3e",
      background: "rgba(200, 255, 61, 0.06)",
    },
  },
  cells: {
    style: { paddingLeft: 16, paddingRight: 16, color: "#2B2D28" },
  },
  pagination: {
    style: {
      background: "#FFFFFF",
      borderTop: "1px solid #E2E5DC",
      color: "#5C5F58",
      fontSize: 13,
      fontFamily: "Manrope, sans-serif",
      minHeight: 48,
    },
    pageButtonsStyle: {
      borderRadius: 6,
      color: "#2B2D28",
      fill: "#2B2D28",
      "&:disabled": { color: "#B9BEB1", fill: "#B9BEB1" },
      "&:hover:not(:disabled)": { background: "#EDEFE8" },
    },
  },
  noData: {
    style: {
      padding: "32px 16px",
      fontFamily: "Manrope, sans-serif",
      color: "#5C5F58",
      background: "#FFFFFF",
    },
  },
  progress: {
    style: { color: "#145c2e", background: "transparent" },
  },
};

export default vyTableStyles;
