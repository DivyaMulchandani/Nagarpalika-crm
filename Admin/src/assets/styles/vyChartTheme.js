// Central recharts theming constants for Vyaris brand.
// Spread these into chart props (e.g. <Line stroke={vyChart.primary}>).

export const vyChart = {
  primary: "#1a7a3e",
  primaryDeep: "#145c2e",
  secondary: "#5C5F58",
  ink: "#0A0B0A",
  axis: "#5C5F58",
  grid: "#E2E5DC",
  gridDashed: "3 3",
  success: "#7EE787",
  warning: "#F2C94C",
  danger: "#FF6A55",
  info: "#7BD3F7",
  series: [
    "#1a7a3e",
    "#145c2e",
    "#7BD3F7",
    "#F2C94C",
    "#FF6A55",
    "#7EE787",
    "#5C5F58",
  ],
  tooltip: {
    contentStyle: {
      background: "#FFFFFF",
      border: "1px solid #D2D6CB",
      borderRadius: 8,
      fontFamily: "Manrope, sans-serif",
      fontSize: 12,
      color: "#0A0B0A",
      boxShadow: "0 8px 24px rgba(10, 11, 10, 0.08)",
    },
    labelStyle: {
      fontFamily: "Barlow, sans-serif",
      fontWeight: 600,
      fontSize: 11,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      color: "#5C5F58",
    },
  },
  axisStyle: {
    stroke: "#D2D6CB",
    fontFamily: "JetBrains Mono, monospace",
    fontSize: 11,
    fill: "#5C5F58",
  },
};

export default vyChart;
