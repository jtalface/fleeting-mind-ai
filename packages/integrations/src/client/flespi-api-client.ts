import type { ExternalTelemetry, ExternalTelemetryPage, ExternalVehicle } from "@fleetmind/shared/contracts/integrations.js";
import type { FleetMetricsApiClient } from "./fleet-metrics-api-client.js";

const FLESPI_BASE_URL = "https://flespi.io";

export interface FlespiApiConfig {
  token: string;
  timeoutMs: number;
  /** Max messages per device per sync page. */
  messagesPageSize: number;
}

interface FlespiDeviceRow {
  id: number;
  name?: string;
  configuration?: {
    ident?: string;
  };
}

interface FlespiMessageRow {
  timestamp?: number;
  "position.latitude"?: number;
  "position.longitude"?: number;
  "position.speed"?: number;
  "position.direction"?: number;
  "vehicle.mileage"?: number;
  "fuel.level"?: number;
  "engine.ignition.status"?: boolean;
}

/**
 * Adapter for the [flespi REST API](https://flespi.com/rest-api).
 *
 * - Devices: `GET /gw/devices/all`
 * - Telemetry history: `GET /gw/devices/{id}/messages?data={"from":<unix>}`
 */
export class FlespiApiClient implements FleetMetricsApiClient {
  public constructor(private readonly config: FlespiApiConfig) {}

  public async listVehicles(): Promise<ExternalVehicle[]> {
    const payload = await this.getJson<{ result?: FlespiDeviceRow[] }>(
      `${FLESPI_BASE_URL}/gw/devices/all`
    );
    const devices = payload.result ?? [];
    return devices.map((device) => mapFlespiDevice(device));
  }

  public async fetchTelemetryPage(deviceExternalId: string, cursor?: string): Promise<ExternalTelemetryPage> {
    const url = new URL(`${FLESPI_BASE_URL}/gw/devices/${encodeURIComponent(deviceExternalId)}/messages`);
    url.searchParams.set("limit", String(this.config.messagesPageSize));

    if (cursor) {
      const fromUnix = Number(cursor);
      if (Number.isFinite(fromUnix)) {
        url.searchParams.set("data", JSON.stringify({ from: fromUnix }));
      }
    }

    const payload = await this.getJson<{ result?: FlespiMessageRow[] }>(url.toString());
    const messages = payload.result ?? [];
    const items = messages
      .map((message) => mapFlespiMessage(deviceExternalId, message))
      .filter((item): item is ExternalTelemetry => item !== null);

    const maxTs = items.reduce((max, item) => Math.max(max, Date.parse(item.timestamp) / 1000), 0);
    const nextCursor = maxTs > 0 ? String(Math.floor(maxTs) + 1) : undefined;

    return {
      items,
      ...(items.length >= this.config.messagesPageSize && nextCursor ? { nextCursor } : {})
    };
  }

  private async getJson<T>(url: string): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `FlespiToken ${this.config.token}`
        },
        signal: controller.signal
      });
      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Flespi API ${response.status}: ${body.slice(0, 300)}`);
      }
      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }
}

function mapFlespiDevice(device: FlespiDeviceRow): ExternalVehicle {
  const ident = device.configuration?.ident ?? device.name ?? String(device.id);
  const name = device.name ?? ident;
  const vehicleClass = /sweeper|truck|haul/i.test(name) ? "truck" : "other";

  return {
    id: String(device.id),
    vin: ident,
    plateNumber: name,
    vehicleClass,
    active: true
  };
}

function mapFlespiMessage(deviceExternalId: string, message: FlespiMessageRow): ExternalTelemetry | null {
  const lat = message["position.latitude"];
  const lng = message["position.longitude"];
  const unix = message.timestamp ?? 0;

  if (lat === undefined || lng === undefined || !unix) {
    return null;
  }

  const point: ExternalTelemetry = {
    vehicleId: deviceExternalId,
    timestamp: new Date(unix * 1000).toISOString(),
    latitude: lat,
    longitude: lng
  };

  if (message["position.speed"] !== undefined) {
    point.speedKph = message["position.speed"];
  }
  if (message["position.direction"] !== undefined) {
    point.headingDegrees = message["position.direction"];
  }
  if (message["vehicle.mileage"] !== undefined) {
    point.odometerKm = message["vehicle.mileage"];
  }
  if (message["fuel.level"] !== undefined) {
    point.fuelLevelPct = message["fuel.level"];
  }
  if (message["engine.ignition.status"] !== undefined) {
    point.ignitionOn = message["engine.ignition.status"];
  }

  return point;
}
