import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { loadGoogleMaps } from "@/lib/google-maps";
import {
  approximateAreaHectares,
  centroidFromPolygon,
  type GeoPoint,
} from "@/lib/geo";

interface FincaDrawingFieldProps {
  initialPath?: GeoPoint[];
  onChange: (nextPath: GeoPoint[]) => void;
}

function serializePath(path: GeoPoint[]): string {
  return JSON.stringify(path);
}

export function FincaDrawingField({ initialPath = [], onChange }: FincaDrawingFieldProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const drawingManagerRef = useRef<any>(null);
  const polygonRef = useRef<any>(null);
  const listenersRef = useRef<any[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const serializedPath = useMemo(() => serializePath(initialPath), [initialPath]);

  useEffect(() => {
    if (!apiKey) {
      setStatus("error");
      setError("Agrega `VITE_GOOGLE_MAPS_API_KEY` para dibujar el polígono sobre Google Maps.");
      return;
    }

    if (!mapElementRef.current) return;

    let mounted = true;

    const attachPolygonListeners = (polygon: any) => {
      listenersRef.current.forEach((listener) => listener.remove?.());
      listenersRef.current = [];

      const path = polygon.getPath();
      const sync = () => {
        const nextPath = Array.from({ length: path.getLength() }, (_, index) => {
          const point = path.getAt(index);
          return { lat: point.lat(), lng: point.lng() };
        });
        onChange(nextPath);
      };

      ["insert_at", "remove_at", "set_at"].forEach((eventName) => {
        listenersRef.current.push(path.addListener(eventName, sync));
      });

      sync();
    };

    const renderPolygon = (googleMaps: any, map: any, pathPoints: GeoPoint[]) => {
      if (polygonRef.current) {
        polygonRef.current.setMap(null);
      }

      if (pathPoints.length < 3) {
        polygonRef.current = null;
        return;
      }

      const polygon = new googleMaps.maps.Polygon({
        paths: pathPoints,
        map,
        editable: true,
        draggable: false,
        fillColor: "#4f8f47",
        fillOpacity: 0.2,
        strokeColor: "#2d7a3e",
        strokeWeight: 2,
      });

      polygonRef.current = polygon;
      attachPolygonListeners(polygon);

      const bounds = new googleMaps.maps.LatLngBounds();
      pathPoints.forEach((point) => bounds.extend(point));
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, 48);
      }
    };

    setStatus("loading");
    setError(null);

    void loadGoogleMaps(apiKey)
      .then(() => {
        if (!mounted || !mapElementRef.current) return;
        const googleMaps = (window as Window & { google: any }).google;
        const initialCenter = initialPath[0] ?? { lat: 5.0689, lng: -75.5174 };
        const map = new googleMaps.maps.Map(mapElementRef.current, {
          center: initialCenter,
          zoom: initialPath.length > 0 ? 16 : 12,
          mapTypeId: "satellite",
          streetViewControl: false,
          fullscreenControl: false,
          mapTypeControl: true,
        });
        mapRef.current = map;

        drawingManagerRef.current = new googleMaps.maps.drawing.DrawingManager({
          drawingMode: initialPath.length > 0 ? null : googleMaps.maps.drawing.OverlayType.POLYGON,
          drawingControl: true,
          drawingControlOptions: {
            position: googleMaps.maps.ControlPosition.TOP_CENTER,
            drawingModes: [googleMaps.maps.drawing.OverlayType.POLYGON],
          },
          polygonOptions: {
            editable: true,
            draggable: false,
            fillColor: "#4f8f47",
            fillOpacity: 0.2,
            strokeColor: "#2d7a3e",
            strokeWeight: 2,
          },
        });

        drawingManagerRef.current.setMap(map);
        drawingManagerRef.current.addListener("overlaycomplete", (event: any) => {
          if (event.type !== googleMaps.maps.drawing.OverlayType.POLYGON) return;
          if (polygonRef.current) {
            polygonRef.current.setMap(null);
          }
          drawingManagerRef.current.setDrawingMode(null);
          polygonRef.current = event.overlay;
          attachPolygonListeners(event.overlay);
        });

        renderPolygon(googleMaps, map, initialPath);
        setStatus("ready");
      })
      .catch((loadError: unknown) => {
        if (!mounted) return;
        setStatus("error");
        setError(loadError instanceof Error ? loadError.message : "No se pudo inicializar el mapa.");
      });

    return () => {
      mounted = false;
      listenersRef.current.forEach((listener) => listener.remove?.());
      listenersRef.current = [];
      if (polygonRef.current) {
        polygonRef.current.setMap(null);
      }
      mapRef.current = null;
    };
  }, [apiKey, onChange]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const googleMaps = (window as Window & { google?: any }).google;
    const map = mapRef.current;
    if (!googleMaps || !map) return;

    const currentPath = polygonRef.current
      ? Array.from({ length: polygonRef.current.getPath().getLength() }, (_, index) => {
          const point = polygonRef.current.getPath().getAt(index);
          return { lat: point.lat(), lng: point.lng() };
        })
      : [];

    if (serializePath(currentPath) === serializedPath) {
      return;
    }

    if (polygonRef.current) {
      polygonRef.current.setMap(null);
      polygonRef.current = null;
    }

    if (initialPath.length < 3) return;

    const polygon = new googleMaps.maps.Polygon({
      paths: initialPath,
      map,
      editable: true,
      draggable: false,
      fillColor: "#4f8f47",
      fillOpacity: 0.2,
      strokeColor: "#2d7a3e",
      strokeWeight: 2,
    });

    polygonRef.current = polygon;
    const path = polygon.getPath();
    listenersRef.current.forEach((listener) => listener.remove?.());
    listenersRef.current = [];

    const sync = () => {
      const nextPath = Array.from({ length: path.getLength() }, (_, index) => {
        const point = path.getAt(index);
        return { lat: point.lat(), lng: point.lng() };
      });
      if (serializePath(nextPath) !== serializedPath) {
        onChange(nextPath);
      }
    };

    ["insert_at", "remove_at", "set_at"].forEach((eventName) => {
      listenersRef.current.push(path.addListener(eventName, sync));
    });
  }, [initialPath, onChange, serializedPath]);

  const centroid = initialPath.length >= 3 ? centroidFromPolygon(initialPath) : null;
  const areaHectares = initialPath.length >= 3 ? approximateAreaHectares(initialPath) : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Delimita tu finca en Google Maps</p>
          <p className="text-xs text-muted-foreground">
            Dibuja el predio sobre vista satelital. El centroid se usará para clima y simulación.
          </p>
        </div>
        {initialPath.length >= 3 && (
          <Badge variant="secondary">{initialPath.length} vértices</Badge>
        )}
      </div>

      <Card className="overflow-hidden border-border/60 p-0">
        <div ref={mapElementRef} className="h-80 w-full bg-muted" />
      </Card>

      {status === "loading" && (
        <p className="text-xs text-muted-foreground">Cargando Google Maps…</p>
      )}
      {status === "error" && error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
          Centroide: {centroid ? `${centroid.lat.toFixed(5)}, ${centroid.lng.toFixed(5)}` : "dibuja un polígono"}
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
          Área aproximada: {areaHectares ? `${areaHectares.toFixed(2)} ha` : "pendiente"}
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([])}
      >
        Limpiar polígono
      </Button>
    </div>
  );
}
