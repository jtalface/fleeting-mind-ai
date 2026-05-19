export type TenantId = string;
export type VehicleId = string;
export type TripId = string;
export type DriverId = string;
export type EquipmentId = string;
export type TimestampIso = string;
export interface Vehicle {
    id: VehicleId;
    tenantId: TenantId;
    vin: string;
    plateNumber?: string;
    class: "truck" | "van" | "car" | "heavy_equipment" | "other";
    make?: string;
    model?: string;
    year?: number;
    odometerKm?: number;
    active: boolean;
    createdAt: TimestampIso;
    updatedAt: TimestampIso;
}
export interface TelemetryPoint {
    tenantId: TenantId;
    vehicleId: VehicleId;
    timestamp: TimestampIso;
    latitude: number;
    longitude: number;
    speedKph?: number;
    headingDegrees?: number;
    engineRpm?: number;
    ignitionOn?: boolean;
    fuelLevelPct?: number;
    odometerKm?: number;
    engineHours?: number;
    source: "device" | "partner_api" | "manual";
}
export interface Trip {
    id: TripId;
    tenantId: TenantId;
    vehicleId: VehicleId;
    driverId?: DriverId;
    startTime: TimestampIso;
    endTime: TimestampIso;
    startOdometerKm: number;
    endOdometerKm: number;
    distanceKm: number;
    idleMinutes: number;
    averageSpeedKph: number;
    geofenceStartId?: string;
    geofenceEndId?: string;
}
export interface FuelReading {
    id: string;
    tenantId: TenantId;
    vehicleId: VehicleId;
    timestamp: TimestampIso;
    volumeLiters: number;
    totalCost: number;
    currency: string;
    stationName?: string;
    source: "telematics" | "fuel_card" | "manual";
}
export interface MaintenanceRecord {
    id: string;
    tenantId: TenantId;
    vehicleId: VehicleId;
    type: "preventive" | "repair" | "inspection";
    status: "scheduled" | "in_progress" | "completed" | "canceled";
    occurredAt?: TimestampIso;
    dueAt?: TimestampIso;
    odometerKm?: number;
    engineHours?: number;
    laborCost?: number;
    partsCost?: number;
    totalCost?: number;
    notes?: string;
}
export interface MetricValue {
    metricKey: "revenue" | "cost" | "profit" | "profit_margin_pct" | "fuel_cost_per_km" | "idle_ratio_pct" | "utilization_pct" | "on_time_pct";
    value: number;
    unit: "currency" | "percent" | "ratio" | "distance" | "duration" | "count";
    timeframe: "today" | "yesterday" | "last_7_days" | "last_30_days" | "month_to_date" | "custom";
    asOf: TimestampIso;
}
export interface Insight {
    id: string;
    tenantId: TenantId;
    entityType: "fleet" | "vehicle" | "route" | "driver";
    entityId: string;
    severity: "info" | "warning" | "critical";
    title: string;
    description: string;
    supportingMetrics: MetricValue[];
    recommendation: string;
    confidence: number;
    createdAt: TimestampIso;
}
export interface Conversation {
    id: string;
    tenantId: TenantId;
    subject?: string;
    createdAt: TimestampIso;
    updatedAt: TimestampIso;
}
export interface ConversationMessage {
    id: string;
    conversationId: string;
    tenantId: TenantId;
    role: "user" | "assistant" | "system";
    content: string;
    createdAt: TimestampIso;
}
//# sourceMappingURL=domain.d.ts.map