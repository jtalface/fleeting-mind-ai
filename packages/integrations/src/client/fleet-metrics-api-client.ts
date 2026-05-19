import {
  externalTelemetryPageSchema,
  externalTelemetrySchema,
  externalVehicleSchema,
  type ExternalTelemetry,
  type ExternalTelemetryPage,
  type ExternalVehicle
} from "@fleetmind/shared/contracts/integrations.js";
import type { FleetMetricsApiConfig, FlespiConfig } from "../config.js";
import { FlespiApiClient } from "./flespi-api-client.js";

export interface FleetMetricsApiClient {
  listVehicles(): Promise<ExternalVehicle[]>;
  fetchTelemetryPage(vehicleExternalId: string, cursor?: string): Promise<ExternalTelemetryPage>;
}

export class HttpFleetMetricsApiClient implements FleetMetricsApiClient {
  public constructor(private readonly config: FleetMetricsApiConfig) {}

  public async listVehicles(): Promise<ExternalVehicle[]> {
    const url = `${this.config.baseUrl}${this.config.vehiclesPath}`;
    const payload = await this.getJson(url);
    const items = Array.isArray(payload) ? payload : (payload as { data?: unknown }).data;
    if (!Array.isArray(items)) {
      throw new Error("Fleet metrics API vehicles response must be an array or { data: [] }.");
    }
    return items.map((item) => externalVehicleSchema.parse(item));
  }

  public async fetchTelemetryPage(vehicleExternalId: string, cursor?: string): Promise<ExternalTelemetryPage> {
    const path = this.config.telemetryPathTemplate.replace("{vehicleId}", encodeURIComponent(vehicleExternalId));
    const url = new URL(`${this.config.baseUrl}${path}`);
    if (cursor) {
      url.searchParams.set("cursor", cursor);
    }
    url.searchParams.set("limit", "500");

    const payload = await this.getJson(url.toString());
    if (Array.isArray(payload)) {
      return externalTelemetryPageSchema.parse({
        items: payload.map((item) => externalTelemetrySchema.parse(item))
      });
    }
    return externalTelemetryPageSchema.parse(payload);
  }

  private async getJson(url: string): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${this.config.apiKey}`
        },
        signal: controller.signal
      });
      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Fleet metrics API ${response.status}: ${body.slice(0, 200)}`);
      }
      return (await response.json()) as unknown;
    } finally {
      clearTimeout(timeout);
    }
  }
}

/** Deterministic client for local dev/tests when external API is unavailable. */
export class MockFleetMetricsApiClient implements FleetMetricsApiClient {
  public constructor(private readonly fixtures: { vehicles: ExternalVehicle[]; telemetry: ExternalTelemetry[] }) {}

  public async listVehicles(): Promise<ExternalVehicle[]> {
    return this.fixtures.vehicles;
  }

  public async fetchTelemetryPage(vehicleExternalId: string, cursor?: string): Promise<ExternalTelemetryPage> {
    if (cursor) {
      return { items: [] };
    }
    return {
      items: this.fixtures.telemetry.filter((point) => point.vehicleId === vehicleExternalId)
    };
  }
}

export function createFlespiApiClient(config: FlespiConfig | null): FleetMetricsApiClient | null {
  if (!config) {
    return null;
  }
  return new FlespiApiClient(config);
}

export function createFleetMetricsApiClient(config: FleetMetricsApiConfig | null): FleetMetricsApiClient | null {
  if (!config) {
    return null;
  }
  return new HttpFleetMetricsApiClient(config);
}
