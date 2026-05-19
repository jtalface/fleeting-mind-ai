import { z } from "zod";

const integrationsEnvSchema = z.object({
  INTEGRATIONS_PROVIDER: z.enum(["generic", "flespi"]).optional(),
  FLESPI_TOKEN: z.string().min(1).optional(),
  FLESPI_MESSAGES_PAGE_SIZE: z.coerce.number().int().positive().max(1000).default(200),
  FLEET_METRICS_API_BASE_URL: z.string().url().optional(),
  FLEET_METRICS_API_KEY: z.string().min(1).optional(),
  FLEET_METRICS_API_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  FLEET_METRICS_VEHICLES_PATH: z.string().default("/vehicles"),
  FLEET_METRICS_TELEMETRY_PATH: z.string().default("/vehicles/{vehicleId}/telemetry")
});

export type IntegrationsProvider = "generic" | "flespi";

export type FleetMetricsApiConfig = {
  baseUrl: string;
  apiKey: string;
  timeoutMs: number;
  vehiclesPath: string;
  telemetryPathTemplate: string;
};

export interface FlespiConfig {
  token: string;
  timeoutMs: number;
  messagesPageSize: number;
}

export function loadIntegrationsEnv(env: NodeJS.ProcessEnv = process.env) {
  return integrationsEnvSchema.safeParse(env);
}

export function resolveIntegrationsProvider(env: NodeJS.ProcessEnv = process.env): IntegrationsProvider {
  const parsed = loadIntegrationsEnv(env);
  if (!parsed.success) {
    return "generic";
  }
  if (parsed.data.INTEGRATIONS_PROVIDER === "flespi" || parsed.data.FLESPI_TOKEN) {
    return "flespi";
  }
  return "generic";
}

const FLESPI_TOKEN_PLACEHOLDERS = new Set([
  "replace-me",
  "replace-me-with-your-token",
  "your-flespi-token"
]);

function isUsableFlespiToken(token: string): boolean {
  const trimmed = token.trim();
  return trimmed.length > 0 && !FLESPI_TOKEN_PLACEHOLDERS.has(trimmed);
}

export function loadFlespiConfig(env: NodeJS.ProcessEnv = process.env): FlespiConfig | null {
  const parsed = loadIntegrationsEnv(env);
  if (!parsed.success || !parsed.data.FLESPI_TOKEN || !isUsableFlespiToken(parsed.data.FLESPI_TOKEN)) {
    return null;
  }
  return {
    token: parsed.data.FLESPI_TOKEN.trim(),
    timeoutMs: parsed.data.FLEET_METRICS_API_TIMEOUT_MS,
    messagesPageSize: parsed.data.FLESPI_MESSAGES_PAGE_SIZE
  };
}

export function loadFleetMetricsApiConfig(
  env: NodeJS.ProcessEnv = process.env
): FleetMetricsApiConfig | null {
  const parsed = loadIntegrationsEnv(env);
  if (!parsed.success) {
    return null;
  }
  const { FLEET_METRICS_API_BASE_URL, FLEET_METRICS_API_KEY } = parsed.data;
  if (!FLEET_METRICS_API_BASE_URL || !FLEET_METRICS_API_KEY) {
    return null;
  }
  return {
    baseUrl: FLEET_METRICS_API_BASE_URL.replace(/\/$/, ""),
    apiKey: FLEET_METRICS_API_KEY,
    timeoutMs: parsed.data.FLEET_METRICS_API_TIMEOUT_MS,
    vehiclesPath: parsed.data.FLEET_METRICS_VEHICLES_PATH,
    telemetryPathTemplate: parsed.data.FLEET_METRICS_TELEMETRY_PATH
  };
}

export function isFleetMetricsApiConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return resolveIntegrationsProvider(env) === "flespi"
    ? loadFlespiConfig(env) !== null
    : loadFleetMetricsApiConfig(env) !== null;
}
