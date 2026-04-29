/**
 * Climate & Elevation APIs for AgroSync
 *
 * NASA POWER (power.larc.nasa.gov) — wind speed + humidity, no auth required
 * Open-Elevation (api.open-elevation.com) — DEM-based slope, no auth required
 */

export interface NasaClimate {
  windKmh: number;
  humidity: number;
  date: string;
}

/**
 * Fetch yesterday's daily wind speed (WS2M, m/s → km/h)
 * and relative humidity (RH2M, %) from NASA POWER API.
 *
 * Uses yesterday to guarantee data availability (today's data is not yet processed).
 */
export async function fetchNasaClimate(lat: number, lon: number): Promise<NasaClimate> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD

  const url =
    `https://power.larc.nasa.gov/api/temporal/daily/point` +
    `?parameters=WS2M,RH2M` +
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

  if (ws == null || rh == null || ws < 0) {
    throw new Error("NASA POWER: datos no disponibles para estas coordenadas");
  }

  return {
    windKmh: Math.round(ws * 3.6 * 10) / 10, // m/s → km/h, 1 decimal
    humidity: Math.round(Math.max(20, Math.min(100, rh))),
    date: yesterday.toLocaleDateString("es-CO"),
  };
}

/**
 * Estimate terrain slope in degrees from elevation data at 5 sample points
 * (~100 m apart) using the Open-Elevation API (SRTM-derived DEM).
 *
 * Computes NS and EW gradient vectors and returns the steepest slope angle.
 */
export async function fetchSlopeDeg(lat: number, lon: number): Promise<number> {
  const delta = 0.0009; // ≈ 100 m at equatorial latitudes

  const res = await fetch("https://api.open-elevation.com/api/v1/lookup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      locations: [
        { latitude: lat, longitude: lon },           // center
        { latitude: lat + delta, longitude: lon },   // north
        { latitude: lat - delta, longitude: lon },   // south
        { latitude: lat, longitude: lon + delta },   // east
        { latitude: lat, longitude: lon - delta },   // west
      ],
    }),
  });

  if (!res.ok) throw new Error(`Open-Elevation ${res.status}`);

  const data = await res.json();
  const e = (data.results as { elevation: number }[]).map((r) => r.elevation);

  // Gradient in rise/run (dimensionless)
  const distM = delta * 111_000; // degrees → meters (approx)
  const slopeNS = Math.abs(e[1] - e[2]) / (2 * distM);
  const slopeEW = Math.abs(e[3] - e[4]) / (2 * distM);
  const maxSlope = Math.max(slopeNS, slopeEW);

  return Math.min(45, Math.round(Math.atan(maxSlope) * (180 / Math.PI)));
}

/**
 * Fetch both climate + slope in parallel.
 * Slope failure is silent — returns null so the caller keeps the manual value.
 */
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
