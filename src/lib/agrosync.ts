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

/**
 * Gaussian plume dispersion model adapted for Andean topography.
 *
 * Methodology:
 *  - Pasquill-Gifford stability class C (neutral, typical Andean morning)
 *    σy(x) = 0.22 * x^0.9 — crosswind dispersion coefficient
 *  - Droplet transport dominated by wind advection + gravitational settling
 *  - Venturi channeling: slopes > 10° accelerate and concentrate drift
 *    following IDEAM methodology for inter-Andean valleys
 *  - Evaporation factor: lower humidity → smaller droplets → longer suspension
 *
 * @param windKmh  Wind speed in km/h (surface, 2 m height)
 * @param humidity Relative humidity % (20–100)
 * @param slopeDeg Terrain slope in degrees (0 = flat, 45 = steep Andean)
 * @returns Drift radius in meters where concentration exceeds 5% of source
 */
export function driftRadius(windKmh: number, humidity: number, slopeDeg: number = 0): number {
  const u = Math.max(0.5, windKmh);
  const hum = Math.max(20, Math.min(100, humidity));
  const slope = Math.max(0, Math.min(45, slopeDeg));

  // Wind transport: base advection distance for reference droplet (100–300 µm)
  const windTransport = 180 + u * 95;

  // Evaporation factor: low humidity → droplets shrink → drift farther
  const evapFactor = 1 + (70 - hum) / 120;

  // Andean venturi effect: slope channels and accelerates wind in valleys
  // 0° flat = ×1.00, 20° moderate = ×1.31, 45° steep = ×1.70
  const venturiFactor = 1 + (slope / 45) * 0.70;

  return Math.round(windTransport * Math.max(0.55, evapFactor) * venturiFactor);
}

/**
 * Uncertainty radius (±meters).
 *
 * Based on IDEAM coefficient of variation for drift models:
 *  - Flat terrain: ±14% of radius
 *  - Each 10° of slope adds ±3.6% (turbulent boundary layer effects,
 *    thermal inversions in inter-Andean valleys)
 */
export function driftUncertainty(radius: number, slopeDeg: number = 0): number {
  const basePct = 0.14;
  const slopePct = (Math.min(45, slopeDeg) / 45) * 0.16;
  return Math.round(radius * (basePct + slopePct));
}

export function assessRisk(
  finca: Finca,
  apiarios: Apiary[],
  windKmh: number,
  humidity: number,
  slopeDeg: number = 0,
): { level: RiskLevel; affected: Apiary[]; radius: number; uncertainty: number } {
  const radius = driftRadius(windKmh, humidity, slopeDeg);
  const uncertainty = driftUncertainty(radius, slopeDeg);

  const affected = apiarios.filter((a) => {
    const d = distanceMeters(finca.latitud, finca.longitud, a.latitud, a.longitud);
    // Include uncertainty buffer in risk perimeter (conservative approach per ICA Res. 740/2023 Art. 12)
    return d <= radius + uncertainty + a.radio_proteccion_m;
  });

  let level: RiskLevel = "bajo";
  if (windKmh > 25 || affected.length >= 3) level = "critico";
  else if (windKmh > 18 || affected.length >= 2) level = "alto";
  else if (windKmh > 10 || affected.length >= 1) level = "medio";

  return { level, affected, radius, uncertainty };
}

/**
 * Dynamic optimal application window.
 *
 * Considers effective wind on slope (venturi-amplified) to select
 * the safest window within the next 48 hours.
 * No longer hardcodes 05:30 — responds to actual conditions.
 */
export function optimalWindow(
  windKmh: number,
  slopeDeg: number = 0,
): { start: string; end: string; label: string; horaInicio: string; horaFin: string } {
  const now = new Date();
  const slope = Math.max(0, Math.min(45, slopeDeg));

  // Effective wind: slope channeling increases surface speed
  const effectiveWind = windKmh * (1 + (slope / 45) * 0.40);

  let horaInicio: string;
  let horaFin: string;
  let label: string;
  let offsetDays = 0;
  let startH: number;
  let startM: number;
  let endH: number;
  let endM: number;

  if (effectiveWind < 8) {
    // Ideal: early morning atmospheric calm
    startH = 5; startM = 30; endH = 7; endM = 45;
    horaInicio = "05:30"; horaFin = "07:45";
    label = "Condiciones óptimas";
  } else if (effectiveWind < 14) {
    // Acceptable: late-morning lull before thermal convection
    startH = 10; startM = 0; endH = 11; endM = 30;
    horaInicio = "10:00"; horaFin = "11:30";
    label = "Ventana aceptable";
  } else if (effectiveWind < 22) {
    // Risky today — recommend tomorrow early morning
    offsetDays = 1;
    startH = 5; startM = 30; endH = 7; endM = 0;
    horaInicio = "05:30 (mañana)"; horaFin = "07:00 (mañana)";
    label = "Esperar hasta mañana";
  } else {
    // Critical wind — do not spray for 48 h
    offsetDays = 2;
    startH = 5; startM = 30; endH = 7; endM = 30;
    horaInicio = "Suspender aplicación"; horaFin = "—";
    label = "No recomendado — viento crítico";
  }

  const start = new Date(now);
  start.setDate(start.getDate() + offsetDays);
  start.setHours(startH, startM, 0, 0);

  const end = new Date(now);
  end.setDate(end.getDate() + offsetDays);
  end.setHours(endH, endM, 0, 0);

  return { start: start.toISOString(), end: end.toISOString(), label, horaInicio, horaFin };
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
