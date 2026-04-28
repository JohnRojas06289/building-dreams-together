import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import type { Apiary, Finca } from "@/lib/agrosync";

// Fix default marker icons (Vite/SSR safe)
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
  useEffect(() => { map.setView([lat, lng], map.getZoom() < 11 ? 12 : map.getZoom()); }, [lat, lng, map]);
  return null;
}

export function RiskMap({
  fincas, apiarios, selectedFinca, driftRadius, affectedIds,
}: {
  fincas: Finca[];
  apiarios: Apiary[];
  selectedFinca: Finca | null;
  driftRadius: number;
  affectedIds: Set<string>;
}) {
  const center: [number, number] = selectedFinca
    ? [selectedFinca.latitud, selectedFinca.longitud]
    : fincas[0]
    ? [fincas[0].latitud, fincas[0].longitud]
    : [5.0689, -75.5174]; // Manizales as default Andean point

  return (
    <MapContainer center={center} zoom={12} scrollWheelZoom className="h-full w-full">
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap'
      />
      {selectedFinca && <Recenter lat={selectedFinca.latitud} lng={selectedFinca.longitud} />}

      {selectedFinca && (
        <Circle
          center={[selectedFinca.latitud, selectedFinca.longitud]}
          radius={driftRadius}
          pathOptions={{ color: "oklch(0.55 0.22 28)", fillColor: "oklch(0.55 0.22 28)", fillOpacity: 0.12, weight: 1.5, dashArray: "4 4" }}
        />
      )}

      {fincas.map((f) => (
        <Marker key={f.id} position={[f.latitud, f.longitud]} icon={fincaIcon}>
          <Popup><strong>{f.nombre}</strong></Popup>
        </Marker>
      ))}

      {apiarios.map((a) => (
        <Marker key={a.id} position={[a.latitud, a.longitud]} icon={apiarioIcon}>
          <Popup>
            <strong>{a.nombre}</strong><br />
            {a.num_colmenas} colmenas
            {affectedIds.has(a.id) && <div style={{ color: "oklch(0.55 0.22 28)", fontWeight: 600, marginTop: 4 }}>⚠ En zona de riesgo</div>}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
