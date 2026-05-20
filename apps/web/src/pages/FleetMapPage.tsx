import type { FleetVehicleLocationDto } from "@fleetmind/shared";
import { Card, PageHeader } from "@fleetmind/ui";
import L from "leaflet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { ApiClientConfig } from "../api/client.js";
import { useFleetLocations } from "../hooks/useFleetLocations.js";
import {
  clusterFleetLocationsForZoom,
  collapsedClusterCount,
  outlierCount,
  positionsForMapBounds,
  vehiclesInCollapsedClusters,
  type FleetLocationCluster,
  type LatLng
} from "../lib/fleet-map-geo.js";
import {
  createFleetClusterIcon,
  createFleetSingleIcon,
  FLEET_STATUS_COLOR,
  resolveClusterStatus
} from "../lib/fleet-map-icons.js";
import "../styles/fleet-map.css";

interface FleetGroupStats {
  groupCount: number;
  vehiclesGrouped: number;
}

function FitMapBounds({ positions }: { positions: LatLng[] }): null {
  const map = useMap();
  const lastFitKey = useRef("");

  useEffect(() => {
    if (positions.length === 0) {
      return;
    }
    const fitKey = positions.map((p) => p.join(",")).join("|");
    if (lastFitKey.current === fitKey) {
      return;
    }
    lastFitKey.current = fitKey;

    if (positions.length === 1) {
      map.setView(positions[0]!, 14);
      return;
    }
    map.fitBounds(L.latLngBounds(positions), { padding: [48, 48], maxZoom: 16 });
    map.invalidateSize();
  }, [map, positions]);

  return null;
}

function FleetMapMarkers({
  vehicles,
  onGroupStats
}: {
  vehicles: FleetVehicleLocationDto[];
  onGroupStats: (stats: FleetGroupStats) => void;
}): JSX.Element {
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());
  const [centerLat, setCenterLat] = useState(() => map.getCenter().lat);

  useEffect(() => {
    const update = (): void => {
      const nextZoom = map.getZoom();
      const nextCenterLat = map.getCenter().lat;
      setZoom((prev) => (prev === nextZoom ? prev : nextZoom));
      setCenterLat((prev) => (prev === nextCenterLat ? prev : nextCenterLat));
    };
    map.on("zoomend moveend", update);
    return () => {
      map.off("zoomend moveend", update);
    };
  }, [map]);

  const clusters = useMemo(
    () => clusterFleetLocationsForZoom(vehicles, zoom, centerLat),
    [vehicles, zoom, centerLat]
  );

  const groupCount = collapsedClusterCount(clusters);
  const vehiclesGrouped = vehiclesInCollapsedClusters(clusters);

  useEffect(() => {
    onGroupStats({ groupCount, vehiclesGrouped });
  }, [groupCount, vehiclesGrouped, onGroupStats]);

  return (
    <>
      {clusters.map((cluster) =>
        cluster.collapsed ? (
          <GroupedClusterMarker key={cluster.clusterKey} cluster={cluster} />
        ) : (
          <SingleVehicleMarker key={cluster.clusterKey} vehicle={cluster.vehicles[0]!} />
        )
      )}
    </>
  );
}

export interface FleetMapPageProps {
  cfg: ApiClientConfig;
}

export function FleetMapPage({ cfg }: FleetMapPageProps): JSX.Element {
  const { data, loading, error, refresh } = useFleetLocations(cfg);
  const [groupStats, setGroupStats] = useState<FleetGroupStats>({ groupCount: 0, vehiclesGrouped: 0 });
  const handleGroupStats = useCallback((stats: FleetGroupStats) => {
    setGroupStats((prev) =>
      prev.groupCount === stats.groupCount && prev.vehiclesGrouped === stats.vehiclesGrouped ? prev : stats
    );
  }, []);

  const vehicles = data?.vehicles ?? [];

  const positions = useMemo(
    () => vehicles.map((v) => [v.latitude, v.longitude] as LatLng),
    [vehicles]
  );

  const boundsPositions = useMemo(() => positionsForMapBounds(positions), [positions]);

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

      <FleetMapSummary
        locatedCount={data?.locatedCount ?? 0}
        vehicleCount={data?.vehicleCount ?? 0}
        withoutLocation={withoutLocation}
        distantVehicles={distantVehicles}
        groupStats={groupStats}
      />

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
            <FleetMapMarkers vehicles={vehicles} onGroupStats={handleGroupStats} />
          </MapContainer>
        </div>
      </Card>

      {!loading && vehicles.length === 0 ? (
        <p style={{ marginTop: "var(--fm-space-3)", color: "var(--fm-color-text-muted)" }}>
          No vehicle locations yet. Run a Flespi backfill to ingest telemetry.
        </p>
      ) : null}
    </div>
  );
}

function FleetMapSummary({
  locatedCount,
  vehicleCount,
  withoutLocation,
  distantVehicles,
  groupStats
}: {
  locatedCount: number;
  vehicleCount: number;
  withoutLocation: number;
  distantVehicles: number;
  groupStats: FleetGroupStats;
}): JSX.Element {
  return (
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
        <strong style={{ color: "var(--fm-color-text)" }}>{locatedCount}</strong> on map
      </span>
      <span>
        <strong style={{ color: "var(--fm-color-text)" }}>{vehicleCount}</strong> vehicles total
      </span>
      {withoutLocation > 0 ? <span>{withoutLocation} without GPS yet</span> : null}
      {groupStats.groupCount > 0 ? (
        <span>
          <strong style={{ color: "var(--fm-color-text)" }}>{groupStats.vehiclesGrouped}</strong> vehicles in{" "}
          <strong style={{ color: "var(--fm-color-text)" }}>{groupStats.groupCount}</strong> groups at this zoom
        </span>
      ) : (
        <span>Zoom out to group nearby vehicles</span>
      )}
      {distantVehicles > 0 ? (
        <span>{distantVehicles} far from main fleet (zoom focuses the cluster)</span>
      ) : null}
      <span style={{ display: "inline-flex", gap: "var(--fm-space-3)" }}>
        <LegendDot color={FLEET_STATUS_COLOR.idle} label="Single vehicle" />
        <LegendGrouped label="Grouped (count badge)" />
      </span>
    </div>
  );
}

function SingleVehicleMarker({ vehicle }: { vehicle: FleetVehicleLocationDto }): JSX.Element {
  const color = FLEET_STATUS_COLOR[vehicle.status];
  const icon = useMemo(() => createFleetSingleIcon(color), [color]);

  return (
    <Marker position={[vehicle.latitude, vehicle.longitude]} icon={icon}>
      <Popup>
        <VehiclePopupContent vehicle={vehicle} />
      </Popup>
    </Marker>
  );
}

function GroupedClusterMarker({
  cluster
}: {
  cluster: FleetLocationCluster<FleetVehicleLocationDto>;
}): JSX.Element {
  const count = cluster.vehicles.length;
  const status = resolveClusterStatus(cluster.vehicles.map((vehicle) => vehicle.status));
  const color = FLEET_STATUS_COLOR[status];
  const icon = useMemo(() => createFleetClusterIcon(count, color), [count, color]);

  return (
    <Marker position={[cluster.latitude, cluster.longitude]} icon={icon} zIndexOffset={1000}>
      <Tooltip direction="top" offset={[0, -8]} className="fleet-map-tooltip">
        {clusterTooltipText(cluster)}
      </Tooltip>
      <Popup>
        <GroupedClusterPopupContent cluster={cluster} />
      </Popup>
    </Marker>
  );
}

function clusterTooltipText(cluster: FleetLocationCluster<FleetVehicleLocationDto>): string {
  const count = cluster.vehicles.length;
  if (cluster.sameGpsFix) {
    return `${count} vehicles share this GPS fix — click to list all`;
  }
  return `${count} vehicles grouped at this zoom — zoom in to separate, click for list`;
}

function VehiclePopupContent({ vehicle }: { vehicle: FleetVehicleLocationDto }): JSX.Element {
  return (
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
  );
}

function GroupedClusterPopupContent({
  cluster
}: {
  cluster: FleetLocationCluster<FleetVehicleLocationDto>;
}): JSX.Element {
  const count = cluster.vehicles.length;

  return (
    <div style={{ minWidth: "220px" }}>
      <p className="fleet-map-popup__collapsed-title">{count} vehicles in this group</p>
      <p className="fleet-map-popup__collapsed-hint">
        {cluster.sameGpsFix
          ? "These units report the exact same GPS coordinates."
          : "Grouped because they overlap at the current zoom level. Zoom in to split them apart."}
      </p>
      <ul className="fleet-map-popup__collapsed-list">
        {cluster.vehicles.map((vehicle) => (
          <li key={vehicle.vehicleId}>
            <strong>{vehicle.plateNumber ?? vehicle.vehicleId}</strong>
            <br />
            {formatVehicleSummary(vehicle)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatVehicleSummary(vehicle: FleetVehicleLocationDto): string {
  const parts = [`Status: ${vehicle.status}`];
  if (vehicle.speedKph !== undefined) {
    parts.push(`Speed: ${vehicle.speedKph.toFixed(1)} km/h`);
  }
  parts.push(`Updated: ${new Date(vehicle.timestamp).toLocaleString()}`);
  return parts.join(" · ");
}

function LegendDot({ color, label }: { color: string; label: string }): JSX.Element {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
      <span
        style={{
          width: 12,
          height: 12,
          borderRadius: "50%",
          background: color,
          border: "2px solid #fff",
          boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
          display: "inline-block"
        }}
      />
      {label}
    </span>
  );
}

function LegendGrouped({ label }: { label: string }): JSX.Element {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
      <span style={{ position: "relative", width: 28, height: 28, display: "inline-block" }}>
        <span
          style={{
            position: "absolute",
            left: 0,
            top: 4,
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: "#f59e0b",
            border: "2px solid #fff",
            opacity: 0.7
          }}
        />
        <span
          style={{
            position: "absolute",
            left: 7,
            top: 0,
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: "#f59e0b",
            border: "2px solid #fff"
          }}
        />
        <span
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            minWidth: 16,
            height: 16,
            padding: "0 4px",
            borderRadius: 8,
            background: "#0f172a",
            color: "#fff",
            fontSize: 9,
            fontWeight: 800,
            lineHeight: "10px",
            textAlign: "center",
            border: "2px solid #fff"
          }}
        >
          5
        </span>
      </span>
      {label}
    </span>
  );
}
