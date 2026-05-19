export interface DatabasePackageBoundary {
  owns: ["schema", "migrations", "repositories", "tenant_scoping"];
  exposes: ["repository_interfaces", "transaction_helpers"];
  mustNotImport: ["@fleetmind/analytics", "@fleetmind/ai-core", "@fleetmind/web"];
}

export * from "./repositories/index.js";
export * from "./client.js";
