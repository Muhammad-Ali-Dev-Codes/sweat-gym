export const CHART_TOOLTIP_STYLE = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--popover)",
  color: "var(--popover-foreground)",
  fontSize: 13,
  boxShadow: "0 8px 24px rgb(0 0 0 / 0.12)",
} as const;

export const DONUT_COLORS = [
  "#8b5cf6", // purple
  "#f97316", // orange/energy
  "#10b981", // green
  "#ec4899", // pink
  "#3b82f6", // blue
  "#eab308", // yellow
] as const;
