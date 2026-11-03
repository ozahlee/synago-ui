/** Shared Recharts styling so every chart reads as one system. */
export const axisProps = {
  stroke: "var(--muted-foreground)",
  fontSize: 12,
  tickLine: false,
  axisLine: false,
} as const

export const tooltipProps = {
  contentStyle: {
    backgroundColor: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    boxShadow: "0 8px 24px -8px rgb(0 0 0 / 0.15)",
    fontSize: 13,
    padding: "8px 12px",
  },
  labelStyle: { color: "var(--foreground)", fontWeight: 600, marginBottom: 4 },
  itemStyle: { color: "var(--foreground)", padding: 0 },
  cursor: { fill: "var(--accent)", fillOpacity: 0.5, stroke: "var(--border)" },
} as const

export const legendProps = {
  iconType: "circle" as const,
  iconSize: 8,
  wrapperStyle: { fontSize: 12, paddingTop: 12 },
}

export const gridProps = { strokeDasharray: "3 3", vertical: false, stroke: "var(--border)" } as const
