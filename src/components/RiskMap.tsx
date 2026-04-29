import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Circle, Popup, Polygon, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Apiary, Finca } from "@/lib/agrosync";
import { geoJsonToPolygon, type GeoPoint } from "@/lib/geo";

const fincaIcon = L.divIcon({
  className: "",
  html: `<div style="background:oklch(0.42 0.09 150);border:3px solid white;border-radius:50%;width:22px;height:22px;box-shadow:0 4px 12px rgba(0,0,0,.25)"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const apiarioIcon = L.divIcon({
  className: "",
  html: `<div style="background:oklch(0.72 0.16 80);border:3px solid white;border-radius:4px;width:18px;height:18px;transform:rotate(45deg);box-shadow:0 4px 12px rgba(0,0,0,.25)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom() < 11 ? 12 : map.getZoom());
  }, [lat, lng, map]);
  return null;
}

function toLeafletPolygon(points: GeoPoint[]) {
  return points.map((point) => [point.lat, point.lng] as [number, number]);
}

export function RiskMap({
  fincas,
  apiarios,
  selectedFinca,
  driftRadius,
  uncertaintyRadius = 0,
  affectedIds,
  plumePath = [],
}: {
  fincas: Finca[];
  apiarios: Apiary[];
  selectedFinca: Finca | null;
  driftRadius: number;
  uncertaintyRadius?: number;
  affectedIds: Set<string>;
  plumePath?: GeoPoint[];
}) {
  const center: [number, number] = selectedFinca
    ? [selectedFinca.latitud, selectedFinca.longitud]
    : fincas[0]
    ? [fincas[0].latitud, fincas[0].longitud]
    : [5.0689, -75.5174];

  const selectedPolygon = selectedFinca?.poligono_geojson
    ? geoJsonToPolygon(selectedFinca.poligono_geojson)
    : [];

  return (
    <MapContainer center={center} zoom={12} scrollWheelZoom className="h-full w-full">
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap"
      />
      {selectedFinca && <Recenter lat={selectedFinca.latitud} lng={selectedFinca.longitud} />}

      {selectedPolygon.length >= 3 && (
        <Polygon
          positions={toLeafletPolygon(selectedPolygon)}
          pathOptions={{
            color: "oklch(0.42 0.09 150)",
            fillColor: "oklch(0.42 0.09 150)",
            fillOpacity: 0.14,
            weight: 2,
          }}
        />
      )}

      {selectedFinca && plumePath.length >= 4 && (
        <Polygon
          positions={toLeafletPolygon(plumePath)}
          pathOptions={{
            color: "oklch(0.55 0.22 28)",
            fillColor: "oklch(0.55 0.22 28)",
            fillOpacity: 0.16,
            weight: 1.5,
            dashArray: "6 4",
          }}
        />
      )}

      {selectedFinca && uncertaintyRadius > 0 && (
        <Circle
          center={[selectedFinca.latitud, selectedFinca.longitud]}
          radius={driftRadius + uncertaintyRadius}
          pathOptions={{
            color: "oklch(0.55 0.22 28)",
            fillColor: "transparent",
            fillOpacity: 0,
            weight: 1,
            dashArray: "2 6",
            opacity: 0.35,
          }}
        />
      )}

      {selectedFinca && plumePath.length < 4 && (
        <Circle
          center={[selectedFinca.latitud, selectedFinca.longitud]}
          radius={driftRadius}
          pathOptions={{
            color: "oklch(0.55 0.22 28)",
            fillColor: "oklch(0.55 0.22 28)",
            fillOpacity: 0.12,
            weight: 1.5,
            dashArray: "4 4",
          }}
        />
      )}

      {fincas.map((finca) => (
        <Marker key={finca.id} position={[finca.latitud, finca.longitud]} icon={fincaIcon}>
          <Popup><strong>{finca.nombre}</strong></Popup>
        </Marker>
      ))}

      {apiarios.map((apiario) => (
        <Marker key={apiario.id} position={[apiario.latitud, apiario.longitud]} icon={apiarioIcon}>
          <Popup>
            <strong>{apiario.nombre}</strong><br />
            {apiario.num_colmenas} colmenas
            {affectedIds.has(apiario.id) && (
              <div style={{ color: "oklch(0.55 0.22 28)", fontWeight: 600, marginTop: 4 }}>
                ⚠ En zona de riesgo
              </div>
            )}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
