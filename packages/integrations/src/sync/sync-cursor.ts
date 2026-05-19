/** Per-device message cursors stored as JSON in IntegrationSyncState.cursor */
export interface DeviceCursorMap {
  devices: Record<string, string>;
}

export function parseDeviceCursors(raw?: string): DeviceCursorMap {
  if (!raw) {
    return { devices: {} };
  }
  try {
    const parsed = JSON.parse(raw) as DeviceCursorMap;
    if (parsed && typeof parsed === "object" && parsed.devices && typeof parsed.devices === "object") {
      return parsed;
    }
  } catch {
    /* legacy plain unix cursor — treat as default seed */
  }
  return { devices: { _legacy: raw } };
}

export function serializeDeviceCursors(map: DeviceCursorMap): string {
  return JSON.stringify(map);
}

export function getDeviceCursor(map: DeviceCursorMap, deviceExternalId: string): string | undefined {
  return map.devices[deviceExternalId];
}

export function setDeviceCursor(map: DeviceCursorMap, deviceExternalId: string, cursor: string): void {
  map.devices[deviceExternalId] = cursor;
}
