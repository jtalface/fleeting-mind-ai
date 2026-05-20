import L from "leaflet";

export const FLEET_STATUS_COLOR = {
  moving: "#22c55e",
  idle: "#f59e0b",
  offline: "#94a3b8"
} as const;

export type FleetMarkerStatus = keyof typeof FLEET_STATUS_COLOR;

export function resolveClusterStatus(statuses: FleetMarkerStatus[]): FleetMarkerStatus {
  if (statuses.some((status) => status === "moving")) {
    return "moving";
  }
  if (statuses.some((status) => status === "idle")) {
    return "idle";
  }
  return "offline";
}

/** Large stacked marker — visually distinct from single-vehicle dots. */
export function createFleetClusterIcon(count: number, color: string): L.DivIcon {
  const layerCount = Math.min(count, 3);
  const layers = Array.from({ length: layerCount }, (_, index) => {
    const offset = index * 7;
    return `<span class="fleet-cluster-marker__layer fleet-cluster-marker__layer--${index + 1}" style="left:${4 + offset}px;top:${2 + offset}px;background:${color}"></span>`;
  }).join("");

  const countLabel = count > 99 ? "99+" : String(count);

  return L.divIcon({
    className: "fleet-cluster-marker",
    html: `<div class="fleet-cluster-marker__stack" role="img" aria-label="${count} vehicles grouped">
      <span class="fleet-cluster-marker__halo"></span>
      ${layers}
      <span class="fleet-cluster-marker__badge">${countLabel}</span>
    </div>`,
    iconSize: [60, 60],
    iconAnchor: [30, 54],
    popupAnchor: [0, -48],
    tooltipAnchor: [0, -48]
  });
}

/** Small pin-style marker for a lone vehicle. */
export function createFleetSingleIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: "fleet-single-marker",
    html: `<div class="fleet-single-marker__pin" style="--pin-color:${color}" role="img" aria-label="Vehicle"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -12],
    tooltipAnchor: [0, -12]
  });
}
