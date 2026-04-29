/**
 * Climate & Elevation APIs for AgroSync
 *
 * NASA POWER (power.larc.nasa.gov) — weather variables, no auth required
 * Open-Elevation (api.open-elevation.com) — DEM-based slope, no auth required
 */

export interface NasaClimate {
  windKmh: number;
  windDirectionDeg: number;
  humidity: number;
  temperatureC: number;
  date: string;
}

/**
 * Fetch yesterday's daily wind speed, direction, temperature and humidity
 * from NASA POWER.
 */
export async function fetchNasaClimate(lat: number, lon: number): Promise<NasaClimate> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().slice(0, 10).replace(/-/g, "");

  const url =
    `https://power.larc.nasa.gov/api/temporal/daily/point` +
    `?parameters=WS2M,WD2M,RH2M,T2M` +
    `&community=AG` +
    `&longitude=${lon.toFixed(4)}` +
    `&latitude=${lat.toFixed(4)}` +
    `&format=JSON` +
    `&start=${dateStr}&end=${dateStr}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`NASA POWER ${res.status}`);

  const data = await res.json();
  const ws = data?.properties?.parameter?.WS2M?.[dateStr] as number | undefined;
  const rh = data?.properties?.parameter?.RH2M?.[dateStr] as number | undefined;
  const wd = data?.properties?.parameter?.WD2M?.[dateStr] as number | undefined;
  const t2m = data?.properties?.parameter?.T2M?.[dateStr] as number | undefined;

  if (ws == null || rh == null || ws < 0) {
    throw new Error("NASA POWER: datos no disponibles para estas coordenadas");
  }

  return {
    windKmh: Math.round(ws * 3.6 * 10) / 10,
    windDirectionDeg: Math.round(wd ?? 90),
    humidity: Math.round(Math.max(20, Math.min(100, rh))),
    temperatureC: Math.round((t2m ?? 24) * 10) / 10,
    date: yesterday.toLocaleDateString("es-CO"),
  };
}

export async function fetchSlopeDeg(lat: number, lon: number): Promise<number> {
  const delta = 0.0009;

  const res = await fetch("https://api.open-elevation.com/api/v1/lookup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      locations: [
        { latitude: lat, longitude: lon },
        { latitude: lat + delta, longitude: lon },
        { latitude: lat - delta, longitude: lon },
        { latitude: lat, longitude: lon + delta },
        { latitude: lat, longitude: lon - delta },
      ],
    }),
  });

  if (!res.ok) throw new Error(`Open-Elevation ${res.status}`);

  const data = await res.json();
  const elevations = (data.results as { elevation: number }[]).map((row) => row.elevation);
  const distM = delta * 111_000;
  const slopeNS = Math.abs(elevations[1] - elevations[2]) / (2 * distM);
  const slopeEW = Math.abs(elevations[3] - elevations[4]) / (2 * distM);
  const maxSlope = Math.max(slopeNS, slopeEW);

  return Math.min(45, Math.round(Math.atan(maxSlope) * (180 / Math.PI)));
}

export async function fetchAllClimate(
  lat: number,
  lon: number,
): Promise<{ climate: NasaClimate; slope: number | null }> {
  const [climate, slope] = await Promise.allSettled([
    fetchNasaClimate(lat, lon),
    fetchSlopeDeg(lat, lon),
  ]);

  if (climate.status === "rejected") throw climate.reason;

  return {
    climate: climate.value,
    slope: slope.status === "fulfilled" ? slope.value : null,
  };
}
