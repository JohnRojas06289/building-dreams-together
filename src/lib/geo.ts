export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GeoJsonPolygon {
  type: "Polygon";
  coordinates: number[][][];
}

export function closePolygon(points: GeoPoint[]): GeoPoint[] {
  if (points.length === 0) return [];
  const first = points[0];
  const last = points[points.length - 1];
  if (first.lat === last.lat && first.lng === last.lng) return points;
  return [...points, first];
}

export function polygonToGeoJson(points: GeoPoint[]): GeoJsonPolygon | null {
  if (points.length < 3) return null;
  const ring = closePolygon(points).map((point) => [point.lng, point.lat]);
  return { type: "Polygon", coordinates: [ring] };
}

export function geoJsonToPolygon(value: unknown): GeoPoint[] {
  const coordinates = (value as GeoJsonPolygon | null | undefined)?.coordinates?.[0];
  if (!Array.isArray(coordinates)) return [];

  return coordinates
    .filter((pair): pair is number[] => Array.isArray(pair) && pair.length >= 2)
    .map(([lng, lat]) => ({ lat, lng }))
    .filter((point, index, list) => index < list.length - 1 || point.lat !== list[0]?.lat || point.lng !== list[0]?.lng);
}

export function centroidFromPolygon(points: GeoPoint[]): GeoPoint {
  if (points.length === 0) return { lat: 5.0689, lng: -75.5174 };
  if (points.length < 3) {
    const lat = points.reduce((sum, point) => sum + point.lat, 0) / points.length;
    const lng = points.reduce((sum, point) => sum + point.lng, 0) / points.length;
    return { lat, lng };
  }

  const ring = closePolygon(points);
  let areaAccumulator = 0;
  let centroidLat = 0;
  let centroidLng = 0;

  for (let index = 0; index < ring.length - 1; index += 1) {
    const current = ring[index];
    const next = ring[index + 1];
    const factor = current.lng * next.lat - next.lng * current.lat;
    areaAccumulator += factor;
    centroidLng += (current.lng + next.lng) * factor;
    centroidLat += (current.lat + next.lat) * factor;
  }

  if (Math.abs(areaAccumulator) < 1e-9) {
    const lat = points.reduce((sum, point) => sum + point.lat, 0) / points.length;
    const lng = points.reduce((sum, point) => sum + point.lng, 0) / points.length;
    return { lat, lng };
  }

  const polygonArea = areaAccumulator * 0.5;
  return {
    lat: centroidLat / (6 * polygonArea),
    lng: centroidLng / (6 * polygonArea),
  };
}

export function approximateAreaHectares(points: GeoPoint[]): number | null {
  if (points.length < 3) return null;

  const earthRadiusM = 6_371_000;
  const centroid = centroidFromPolygon(points);
  const latFactor = (Math.PI / 180) * earthRadiusM;
  const lngFactor = latFactor * Math.cos((centroid.lat * Math.PI) / 180);
  const ring = closePolygon(points).map((point) => ({
    x: (point.lng - centroid.lng) * lngFactor,
    y: (point.lat - centroid.lat) * latFactor,
  }));

  let doubleArea = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    const current = ring[index];
    const next = ring[index + 1];
    doubleArea += current.x * next.y - next.x * current.y;
  }

  return Math.abs(doubleArea / 2) / 10_000;
}
