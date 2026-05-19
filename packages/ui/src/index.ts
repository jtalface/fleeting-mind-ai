export interface UIPackageBoundary {
  owns: ["design_tokens", "charts", "dashboard_widgets", "chat_components"];
  exposes: ["presentational_components"];
  mustNotImport: ["@fleetmind/database", "@fleetmind/analytics", "@fleetmind/ai-core"];
}

export { Card } from "./Card.js";
export type { CardProps } from "./Card.js";
export { PageHeader } from "./PageHeader.js";
export type { PageHeaderProps } from "./PageHeader.js";
export { KpiStat } from "./KpiStat.js";
export type { KpiStatProps } from "./KpiStat.js";
export { ForecastBandChart } from "./ForecastBandChart.js";
export type { ForecastBandChartProps } from "./ForecastBandChart.js";
export { FleetMetricBars } from "./FleetMetricBars.js";
export type { FleetMetricBarsProps } from "./FleetMetricBars.js";
export { InsightCard } from "./InsightCard.js";
export type { InsightCardProps } from "./InsightCard.js";
export { ChatMessage } from "./ChatMessage.js";
export type { ChatMessageProps } from "./ChatMessage.js";
export { ChatComposer } from "./ChatComposer.js";
export type { ChatComposerProps } from "./ChatComposer.js";
