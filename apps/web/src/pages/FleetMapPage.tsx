import type { FleetVehicleLocationDto } from "@fleetmind/shared";
import { Card, PageHeader } from "@fleetmind/ui";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { ApiClientConfig } from "../api/client.js";
import { useFleetLocations } from "../hooks/useFleetLocations.js";
import {
  outlierCount,
  positionsForMapBounds,
  spreadOverlappingMarkers,
  type LatLng
} from "../lib/fleet-map-geo.js";

const STATUS_COLOR: Record<FleetVehicleLocationDto["status"], string> = {
  moving: "#22c55e",
  idle: "#f59e0b",
  offline: "#94a3b8"
};

function FitMapBounds({ positions }: { positions: LatLng[] }): null {
  const map = useMap();

  useEffect(() => {
    if (positions.length === 0) {
      return;
    }
    if (positions.length === 1) {
      map.setView(positions[0], 14);
      return;
    }
    map.fitBounds(L.latLngBounds(positions), { padding: [48, 48], maxZoom: 16 });
    map.invalidateSize();
  }, [map, positions]);

  return null;
}

export interface FleetMapPageProps {
  cfg: ApiClientConfig;
}

export function FleetMapPage({ cfg }: FleetMapPageProps): JSX.Element {
  const { data, loading, error, refresh } = useFleetLocations(cfg);

  const positions = useMemo(
    () => (data?.vehicles ?? []).map((v) => [v.latitude, v.longitude] as LatLng),
    [data?.vehicles]
  );

  const boundsPositions = useMemo(() => positionsForMapBounds(positions), [positions]);

  const mapVehicles = useMemo(
    () => spreadOverlappingMarkers(data?.vehicles ?? []),
    [data?.vehicles]
  );

  const defaultCenter = useMemo((): LatLng => {
    if (boundsPositions.length > 0) {
      return boundsPositions[0]!;
    }
    return [39.5, -98.35];
  }, [boundsPositions]);

  const withoutLocation = (data?.vehicleCount ?? 0) - (data?.locatedCount ?? 0);
  const distantVehicles = outlierCount(positions);

  return (
    <div>
      <PageHeader
        title="Fleet map"
        subtitle="Latest GPS position per vehicle from telemetry in the database."
        actions={
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            style={{
              padding: "var(--fm-space-2) var(--fm-space-4)",
              borderRadius: "var(--fm-radius-sm)",
              border: "1px solid var(--fm-color-border)",
              background: "var(--fm-color-surface-elevated)",
              color: "var(--fm-color-text)",
              fontWeight: 600,
              cursor: loading ? "wait" : "pointer"
            }}
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        }
      />

      {error ? (
        <p role="alert" style={{ color: "var(--fm-color-critical)", marginBottom: "var(--fm-space-3)" }}>
          {error.message} ({error.code})
        </p>
      ) : null}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "var(--fm-space-3)",
          marginBottom: "var(--fm-space-3)",
          fontSize: "0.9rem",
          color: "var(--fm-color-text-muted)"
        }}
      >
        <span>
          <strong style={{ color: "var(--fm-color-text)" }}>{data?.locatedCount ?? 0}</strong> on map
        </span>
        <span>
          <strong style={{ color: "var(--fm-color-text)" }}>{data?.vehicleCount ?? 0}</strong> vehicles total
        </span>
        {withoutLocation > 0 ? <span>{withoutLocation} without GPS yet</span> : null}
        {distantVehicles > 0 ? (
          <span>
            {distantVehicles} far from main fleet (still on map; zoom focuses the cluster)
          </span>
        ) : null}
        <span style={{ display: "inline-flex", gap: "var(--fm-space-3)" }}>
          <LegendDot color={STATUS_COLOR.moving} label="Moving" />
          <LegendDot color={STATUS_COLOR.idle} label="Idle" />
        </span>
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ height: "min(72vh, 640px)", width: "100%" }}>
          <MapContainer
            key={`fleet-map-${data?.locatedCount ?? 0}`}
            center={defaultCenter}
            zoom={12}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitMapBounds positions={boundsPositions} />
            {mapVehicles.map((vehicle) => (
              <CircleMarker
                key={vehicle.vehicleId}
                center={[vehicle.displayLatitude, vehicle.displayLongitude]}
                radius={9}
                pathOptions={{
                  color: STATUS_COLOR[vehicle.status],
                  fillColor: STATUS_COLOR[vehicle.status],
                  fillOpacity: 0.85,
                  weight: 2
                }}
              >
                <Popup>
                  <div style={{ minWidth: "160px" }}>
                    <strong>{vehicle.plateNumber ?? vehicle.vehicleId}</strong>
                    <br />
                    Status: {vehicle.status}
                    {vehicle.speedKph !== undefined ? (
                      <>
                        <br />
                        Speed: {vehicle.speedKph.toFixed(1)} km/h
                      </>
                    ) : null}
                    <br />
                    Updated: {new Date(vehicle.timestamp).toLocaleString()}
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </Card>

      {!loading && (data?.vehicles.length ?? 0) === 0 ? (
        <p style={{ marginTop: "var(--fm-space-3)", color: "var(--fm-color-text-muted)" }}>
          No vehicle locations yet. Run a Flespi backfill to ingest telemetry.
        </p>
      ) : null}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }): JSX.Element {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: color,
          display: "inline-block"
        }}
      />
      {label}
    </span>
  );
}
