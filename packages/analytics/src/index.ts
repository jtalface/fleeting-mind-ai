export interface AnalyticsPackageBoundary {
  owns: ["kpi_calculations", "profitability_engine", "efficiency_scoring", "forecast_models"];
  exposes: ["compute_metrics", "generate_insights", "run_forecast"];
  mustNotImport: ["@fleetmind/ai-core", "@fleetmind/web"];
}

export * from "./contracts.js";
export * from "./fixtures.js";
export * from "./forecast.js";
export * from "./forecast/champion-engine.js";
export * from "./daily-mart.js";
export * from "./rate-card.js";
export * from "./insights.js";
export * from "./kpi.js";
export * from "./service.js";
export * from "./vehicle-group-metrics.js";
