import type { GeoJsonPolygon, GeoPoint } from "@/lib/geo";

export type RiskLevel = "bajo" | "medio" | "alto" | "critico";
export type ApplicationType = "terrestre" | "aerea";
export type StabilityClass = "A" | "B" | "C" | "D" | "E" | "F";

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
  poligono_geojson?: GeoJsonPolygon | null;
}

export interface DriftInputs {
  windKmh: number;
  windDirectionDeg: number;
  humidity: number;
  temperatureC: number;
  cloudCoverPct: number;
  slopeDeg: number;
  applicationType: ApplicationType;
}

export interface DriftAssessment {
  level: RiskLevel;
  affected: Apiary[];
  radius: number;
  uncertainty: number;
  plumePath: GeoPoint[];
  stabilityClass: StabilityClass;
  concentrationThreshold: number;
}

const applicationProfiles: Record<ApplicationType, { releaseHeightM: number; emissionRate: number; dropletFactor: number }> = {
  terrestre: { releaseHeightM: 1.8, emissionRate: 16, dropletFactor: 1.0 },
  aerea: { releaseHeightM: 4.2, emissionRate: 26, dropletFactor: 1.35 },
};

const concentrationThresholds: Record<ApplicationType, number> = {
  terrestre: 0.00014,
  aerea: 0.00018,
};

const stabilityOrder: StabilityClass[] = ["A", "B", "C", "D", "E", "F"];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function distanceMeters(
  lat1: number, lon1: number, lat2: number, lon2: number,
): number {
  const earthRadiusM = 6_371_000;
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadiusM * Math.asin(Math.sqrt(a));
}

function localOffsetMeters(originLat: number, originLng: number, targetLat: number, targetLng: number) {
  const metersPerDegreeLat = 111_320;
  const metersPerDegreeLng = metersPerDegreeLat * Math.cos((originLat * Math.PI) / 180);
  return {
    eastM: (targetLng - originLng) * metersPerDegreeLng,
    northM: (targetLat - originLat) * metersPerDegreeLat,
  };
}

function offsetLatLng(originLat: number, originLng: number, eastM: number, northM: number): GeoPoint {
  const metersPerDegreeLat = 111_320;
  const metersPerDegreeLng = metersPerDegreeLat * Math.cos((originLat * Math.PI) / 180);
  return {
    lat: originLat + northM / metersPerDegreeLat,
    lng: originLng + eastM / metersPerDegreeLng,
  };
}

function windTravelDirectionDeg(windDirectionDeg: number): number {
  return (windDirectionDeg + 180) % 360;
}

function rotateToWindFrame(eastM: number, northM: number, windDirectionDeg: number) {
  const theta = (windTravelDirectionDeg(windDirectionDeg) * Math.PI) / 180;
  const alongEast = Math.sin(theta);
  const alongNorth = Math.cos(theta);
  const crossEast = Math.sin(theta + Math.PI / 2);
  const crossNorth = Math.cos(theta + Math.PI / 2);

  return {
    x: eastM * alongEast + northM * alongNorth,
    y: eastM * crossEast + northM * crossNorth,
  };
}

function rotateFromWindFrame(x: number, y: number, windDirectionDeg: number) {
  const theta = (windTravelDirectionDeg(windDirectionDeg) * Math.PI) / 180;
  const alongEast = Math.sin(theta);
  const alongNorth = Math.cos(theta);
  const crossEast = Math.sin(theta + Math.PI / 2);
  const crossNorth = Math.cos(theta + Math.PI / 2);

  return {
    eastM: x * alongEast + y * crossEast,
    northM: x * alongNorth + y * crossNorth,
  };
}

export function classifyPasquillStability(
  windKmh: number,
  cloudCoverPct: number,
  hour = new Date().getHours(),
): StabilityClass {
  const windMs = Math.max(0.5, windKmh / 3.6);
  const isDay = hour >= 6 && hour < 18;
  const cloud = clamp(cloudCoverPct, 0, 100);

  if (isDay) {
    const insolation = cloud < 35 ? "strong" : cloud < 70 ? "moderate" : "slight";

    if (windMs < 2) return insolation === "strong" ? "A" : insolation === "moderate" ? "A" : "B";
    if (windMs < 3) return insolation === "strong" ? "A" : insolation === "moderate" ? "B" : "C";
    if (windMs < 5) return insolation === "strong" ? "B" : insolation === "moderate" ? "B" : "C";
    if (windMs < 6.5) return insolation === "strong" ? "C" : "C";
    return "D";
  }

  if (cloud > 60) return windMs < 4 ? "E" : "D";
  if (windMs < 2) return "F";
  if (windMs < 3.5) return "E";
  return "D";
}

function sigmaY(distanceM: number, stability: StabilityClass): number {
  const x = Math.max(distanceM, 1);
  const factors: Record<StabilityClass, number> = {
    A: 0.22,
    B: 0.16,
    C: 0.11,
    D: 0.08,
    E: 0.06,
    F: 0.04,
  };
  return factors[stability] * x * Math.pow(1 + 0.0001 * x, -0.5);
}

function sigmaZ(distanceM: number, stability: StabilityClass): number {
  const x = Math.max(distanceM, 1);
  switch (stability) {
    case "A":
      return 0.20 * x;
    case "B":
      return 0.12 * x;
    case "C":
      return 0.08 * x * Math.pow(1 + 0.0002 * x, -0.5);
    case "D":
      return 0.06 * x * Math.pow(1 + 0.0015 * x, -0.5);
    case "E":
      return 0.03 * x * Math.pow(1 + 0.0003 * x, -1);
    case "F":
      return 0.016 * x * Math.pow(1 + 0.0003 * x, -1);
  }
}

function emissionFactor(inputs: DriftInputs): number {
  const humidityFactor = 1 + (65 - clamp(inputs.humidity, 20, 100)) / 130;
  const temperatureFactor = 1 + clamp(inputs.temperatureC - 24, -8, 12) / 90;
  const slopeAmplification = inputs.slopeDeg > 15 ? 1 + (inputs.slopeDeg - 15) / 90 : 1;
  return Math.max(0.65, humidityFactor) * Math.max(0.8, temperatureFactor) * slopeAmplification;
}

function plumeCenterlineConcentration(distanceM: number, inputs: DriftInputs, stabilityClass: StabilityClass): number {
  const profile = applicationProfiles[inputs.applicationType];
  const windMs = Math.max(0.6, inputs.windKmh / 3.6);
  const sy = sigmaY(distanceM, stabilityClass);
  const sz = sigmaZ(distanceM, stabilityClass);
  const emissionRate = profile.emissionRate * profile.dropletFactor * emissionFactor(inputs);
  const verticalTerm = Math.exp(-((profile.releaseHeightM ** 2) / (2 * sz ** 2)));

  return (emissionRate / (2 * Math.PI * windMs * sy * sz)) * verticalTerm;
}

function gaussianConcentration(distanceM: number, crosswindM: number, inputs: DriftInputs, stabilityClass: StabilityClass): number {
  if (distanceM <= 0) return 0;
  const sy = sigmaY(distanceM, stabilityClass);
  const centerline = plumeCenterlineConcentration(distanceM, inputs, stabilityClass);
  return centerline * Math.exp(-(crosswindM ** 2) / (2 * sy ** 2));
}

export function driftRadius(inputs: DriftInputs): number {
  const stabilityClass = classifyPasquillStability(inputs.windKmh, inputs.cloudCoverPct);
  const threshold = concentrationThresholds[inputs.applicationType];
  let lastDistance = 150;

  for (let distance = 150; distance <= 5_000; distance += 50) {
    const concentration = plumeCenterlineConcentration(distance, inputs, stabilityClass);
    if (concentration < threshold) {
      return lastDistance;
    }
    lastDistance = distance;
  }

  return lastDistance;
}

export function driftUncertainty(radius: number, slopeDeg: number = 0, cloudCoverPct: number = 45): number {
  const slopePenalty = Math.max(0, slopeDeg - 15) / 45 * 0.12;
  const cloudPenalty = Math.abs(clamp(cloudCoverPct, 0, 100) - 50) / 100 * 0.06;
  return Math.round(radius * (0.14 + slopePenalty + cloudPenalty));
}

export function buildPlumePath(finca: Finca, inputs: DriftInputs, radius?: number): GeoPoint[] {
  const stabilityClass = classifyPasquillStability(inputs.windKmh, inputs.cloudCoverPct);
  const threshold = concentrationThresholds[inputs.applicationType];
  const maxRadius = radius ?? driftRadius(inputs);
  const leftSide: GeoPoint[] = [];
  const rightSide: GeoPoint[] = [];

  for (let distance = 80; distance <= maxRadius; distance += Math.max(60, Math.round(maxRadius / 12))) {
    const centerline = plumeCenterlineConcentration(distance, inputs, stabilityClass);
    if (centerline <= threshold) continue;

    const sy = sigmaY(distance, stabilityClass);
    const lateralLimit = sy * Math.sqrt(Math.max(0, 2 * Math.log(centerline / threshold)));

    const left = rotateFromWindFrame(distance, lateralLimit, inputs.windDirectionDeg);
    const right = rotateFromWindFrame(distance, -lateralLimit, inputs.windDirectionDeg);
    leftSide.push(offsetLatLng(finca.latitud, finca.longitud, left.eastM, left.northM));
    rightSide.unshift(offsetLatLng(finca.latitud, finca.longitud, right.eastM, right.northM));
  }

  return [{ lat: finca.latitud, lng: finca.longitud }, ...leftSide, ...rightSide, { lat: finca.latitud, lng: finca.longitud }];
}

export function assessRisk(
  finca: Finca,
  apiarios: Apiary[],
  inputs: DriftInputs,
): DriftAssessment {
  const radius = driftRadius(inputs);
  const uncertainty = driftUncertainty(radius, inputs.slopeDeg, inputs.cloudCoverPct);
  const stabilityClass = classifyPasquillStability(inputs.windKmh, inputs.cloudCoverPct);
  const threshold = concentrationThresholds[inputs.applicationType];

  const affected = apiarios.filter((apiario) => {
    const offset = localOffsetMeters(finca.latitud, finca.longitud, apiario.latitud, apiario.longitud);
    const windFrame = rotateToWindFrame(offset.eastM, offset.northM, inputs.windDirectionDeg);
    const protectedCrosswind = Math.max(0, Math.abs(windFrame.y) - apiario.radio_proteccion_m);
    const protectedDistance = windFrame.x + apiario.radio_proteccion_m;
    const concentration = gaussianConcentration(protectedDistance, protectedCrosswind, inputs, stabilityClass);
    return concentration >= threshold || distanceMeters(finca.latitud, finca.longitud, apiario.latitud, apiario.longitud) <= radius + uncertainty;
  });

  let level: RiskLevel = "bajo";
  const stabilityIndex = stabilityOrder.indexOf(stabilityClass);
  if (inputs.windKmh > 24 || affected.length >= 3 || stabilityIndex >= 4) level = "critico";
  else if (inputs.windKmh > 16 || affected.length >= 2 || inputs.applicationType === "aerea") level = "alto";
  else if (inputs.windKmh > 9 || affected.length >= 1) level = "medio";

  return {
    level,
    affected,
    radius,
    uncertainty,
    plumePath: buildPlumePath(finca, inputs, radius),
    stabilityClass,
    concentrationThreshold: threshold,
  };
}

export function optimalWindow(
  inputs: Pick<DriftInputs, "windKmh" | "slopeDeg" | "cloudCoverPct" | "applicationType">,
): { start: string; end: string; label: string; horaInicio: string; horaFin: string } {
  const now = new Date();
  const effectiveWind = inputs.windKmh * (1 + clamp(inputs.slopeDeg, 0, 45) / 80);
  const nightBonus = inputs.cloudCoverPct > 60 ? 1 : 0;
  const typePenalty = inputs.applicationType === "aerea" ? 2 : 0;

  let horaInicio: string;
  let horaFin: string;
  let label: string;
  let offsetDays = 0;
  let startH: number;
  let startM: number;
  let endH: number;
  let endM: number;

  if (effectiveWind < 7 - nightBonus && typePenalty === 0) {
    startH = 5; startM = 30; endH = 7; endM = 15;
    horaInicio = "05:30"; horaFin = "07:15";
    label = "Condiciones óptimas";
  } else if (effectiveWind < 12 - nightBonus - typePenalty) {
    startH = 17; startM = 0; endH = 18; endM = 15;
    horaInicio = "17:00"; horaFin = "18:15";
    label = "Ventana aceptable";
  } else if (effectiveWind < 18) {
    offsetDays = 1;
    startH = 5; startM = 30; endH = 7; endM = 0;
    horaInicio = "05:30 (mañana)"; horaFin = "07:00 (mañana)";
    label = "Esperar calma matutina";
  } else {
    offsetDays = 2;
    startH = 5; startM = 30; endH = 7; endM = 0;
    horaInicio = "Suspender aplicación"; horaFin = "—";
    label = "No recomendado";
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
