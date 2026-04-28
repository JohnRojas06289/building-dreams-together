// Shared utilities for AgroSync drift simulation
export type RiskLevel = "bajo" | "medio" | "alto" | "critico";

export interface Apiary {
  id: string;
  nombre: string;
  latitud: number;
  longitud: number;
  num_colmenas: number;
  radio_proteccion_m: number;
}

export interface Finca {
  id: string;
  nombre: string;
  latitud: number;
  longitud: number;
}

// Haversine distance in meters
export function distanceMeters(
  lat1: number, lon1: number, lat2: number, lon2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Drift radius (m) modeled from wind, humidity, slope
export function driftRadius(windKmh: number, humidity: number): number {
  const wind = Math.max(0, windKmh);
  const hum = Math.max(20, Math.min(100, humidity));
  // Higher wind, lower humidity → wider drift
  const base = 200 + wind * 90;
  const humFactor = 1 + (60 - hum) / 100;
  return Math.round(base * Math.max(0.6, humFactor));
}

export function assessRisk(
  finca: Finca,
  apiarios: Apiary[],
  windKmh: number,
  humidity: number,
): { level: RiskLevel; affected: Apiary[]; radius: number } {
  const radius = driftRadius(windKmh, humidity);
  const affected = apiarios.filter((a) => {
    const d = distanceMeters(finca.latitud, finca.longitud, a.latitud, a.longitud);
    return d <= radius + a.radio_proteccion_m;
  });
  let level: RiskLevel = "bajo";
  if (windKmh > 25 || affected.length >= 3) level = "critico";
  else if (windKmh > 18 || affected.length >= 2) level = "alto";
  else if (windKmh > 10 || affected.length >= 1) level = "medio";
  return { level, affected, radius };
}

export function optimalWindow(windKmh: number): { start: string; end: string; label: string } {
  // Heuristic: best window early morning if wind moderate
  const now = new Date();
  const start = new Date(now);
  start.setHours(5, 30, 0, 0);
  const end = new Date(now);
  end.setHours(8, 0, 0, 0);
  const label =
    windKmh < 12 ? "Condiciones óptimas" : windKmh < 20 ? "Ventana aceptable" : "No recomendado hoy";
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    label,
  };
}

export const riskColor: Record<RiskLevel, string> = {
  bajo: "text-success",
  medio: "text-warning",
  alto: "text-warning",
  critico: "text-destructive",
};

export const riskBg: Record<RiskLevel, string> = {
  bajo: "bg-success/10 border-success/30",
  medio: "bg-warning/10 border-warning/30",
  alto: "bg-warning/15 border-warning/40",
  critico: "bg-destructive/10 border-destructive/40",
};
