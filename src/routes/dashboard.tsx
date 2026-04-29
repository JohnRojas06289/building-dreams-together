import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2, Plus, Wind, Droplets, Sprout, Hexagon, Trash2,
  ShieldCheck, MoveVertical, Bot, MessageSquare, AlertTriangle,
  Satellite, FileDown, Compass, Thermometer, Cloud, Radio, Cpu,
} from "lucide-react";
import {
  assessRisk, driftRadius, driftUncertainty, optimalWindow, riskBg,
  classifyPasquillStability, type Apiary, type ApplicationType, type Finca,
} from "@/lib/agrosync";
import {
  getFincas, createFinca, getApiarios, createApiario, deleteApiario,
  getAlertas, createAlertas, type FincaRow, type ApiarioRow, type AlertaRow,
} from "@/lib/store";
import { fetchAllClimate } from "@/lib/climate-api";
import { exportCertificatePdf } from "@/lib/pdf-export";
import { supabase } from "@/integrations/supabase/client";
import { FincaDrawingField } from "@/components/FincaDrawingField";
import {
  approximateAreaHectares,
  centroidFromPolygon,
  polygonToGeoJson,
  type GeoPoint,
} from "@/lib/geo";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — AgroSync" }] }),
});

function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [fincas, setFincas] = useState<FincaRow[]>([]);
  const [apiarios, setApiarios] = useState<ApiarioRow[]>([]);
  const [selectedFincaId, setSelectedFincaId] = useState<string | null>(null);
  const [wind, setWind] = useState(8);
  const [windDirection, setWindDirection] = useState(90);
  const [humidity, setHumidity] = useState(75);
  const [temperature, setTemperature] = useState(24);
  const [cloudCover, setCloudCover] = useState(45);
  const [slope, setSlope] = useState(15);
  const [applicationType, setApplicationType] = useState<ApplicationType>("terrestre");
  const [climateSource, setClimateSource] = useState<"manual" | "nasa">("manual");
  const [climateLoading, setClimateLoading] = useState(false);
  const [climateDate, setClimateDate] = useState<string | null>(null);
  const [MapView, setMapView] = useState<any>(null);
  const [alertsReloadKey, setAlertsReloadKey] = useState(0);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    import("@/components/RiskMap").then(m => setMapView(() => m.RiskMap));
  }, []);

  const refresh = async () => {
    if (!user) return;
    try {
      const [f, apiariosRows] = await Promise.all([getFincas(user.id), getApiarios()]);
      setFincas(f);
      setSelectedFincaId((current) => current ?? f[0]?.id ?? null);
      setApiarios(apiariosRows);
      setAlertsReloadKey((current) => current + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron cargar los datos");
    }
  };

  useEffect(() => {
    if (user) void refresh();
  }, [user]); // eslint-disable-line

  const selectedFinca = useMemo(
    () => fincas.find(f => f.id === selectedFincaId) ?? null,
    [fincas, selectedFincaId],
  );

  // Auto-fetch NASA climate when finca selection changes
  useEffect(() => {
    if (!selectedFinca) return;
    setClimateLoading(true);
    fetchAllClimate(selectedFinca.latitud, selectedFinca.longitud)
      .then(({ climate, slope: slopeFetched }) => {
        setWind(Math.min(40, climate.windKmh));
        setWindDirection(climate.windDirectionDeg);
        setHumidity(climate.humidity);
        setTemperature(climate.temperatureC);
        if (slopeFetched !== null) setSlope(slopeFetched);
        setClimateSource("nasa");
        setClimateDate(climate.date);
        toast.success(`Clima cargado · NASA POWER ${climate.date}`);
      })
      .catch(() => {
        // Silent — keep manual values
      })
      .finally(() => setClimateLoading(false));
  }, [selectedFinca?.id]); // eslint-disable-line

  // Cast to Finca/Apiary shapes (compatible subsets)
  const fincaForCalc = selectedFinca as unknown as Finca | null;
  const apiariosForCalc = apiarios as unknown as Apiary[];
  const driftInputs = useMemo(
    () => ({
      windKmh: wind,
      windDirectionDeg: windDirection,
      humidity,
      temperatureC: temperature,
      cloudCoverPct: cloudCover,
      slopeDeg: slope,
      applicationType,
    }),
    [applicationType, cloudCover, humidity, slope, temperature, wind, windDirection],
  );

  const assessment = useMemo(
    () => fincaForCalc ? assessRisk(fincaForCalc, apiariosForCalc, driftInputs) : null,
    [apiariosForCalc, driftInputs, fincaForCalc],
  );
  const stabilityClass = useMemo(
    () => classifyPasquillStability(wind, cloudCover),
    [cloudCover, wind],
  );
  const window_ = useMemo(() => optimalWindow(driftInputs), [driftInputs]);
  const radius = useMemo(
    () => assessment?.radius ?? driftRadius(driftInputs),
    [assessment?.radius, driftInputs],
  );
  const uncertainty = useMemo(
    () => assessment?.uncertainty ?? driftUncertainty(radius, slope, cloudCover),
    [assessment?.uncertainty, cloudCover, radius, slope],
  );

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main className="container mx-auto space-y-6 px-4 py-8">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold">Centro de operaciones</h1>
            <p className="text-sm text-muted-foreground">
              Predice deriva · protege apiarios · planifica con datos
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/agente"><Bot className="mr-1.5 h-4 w-4" />Agente IA</Link>
            </Button>
            <NewFincaDialog userId={user.id} onCreated={refresh} />
            <NewApiarioDialog userId={user.id} onCreated={refresh} />
          </div>
        </div>

        {/* Empty state */}
        {fincas.length === 0 && apiarios.length === 0 && (
          <Card className="border-dashed border-border/60 bg-background p-10 text-center">
            <Sprout className="mx-auto h-10 w-10 text-primary" />
            <h2 className="mt-4 font-display text-2xl font-semibold">Empieza registrando</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Agrega tu primera finca o un apiario para activar el simulador de deriva.
            </p>
          </Card>
        )}

        {/* KPI Overview */}
        <KpiOverview
          riskLevel={assessment?.level ?? null}
          totalApiarios={apiarios.length}
          affectedApiarios={assessment?.affected.length ?? 0}
        />

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Map */}
          <Card className="overflow-hidden border-border/60 p-0">
            <div className="h-[500px] w-full">
              {MapView ? (
                <MapView
                  fincas={fincas}
                  apiarios={apiarios}
                  selectedFinca={selectedFinca ?? { id: "", nombre: "", latitud: 5.0689, longitud: -75.5174 }}
                  driftRadius={radius}
                  uncertaintyRadius={uncertainty}
                  affectedIds={new Set(assessment?.affected.map(a => a.id) ?? [])}
                  plumePath={assessment?.plumePath ?? []}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              )}
            </div>
          </Card>

          {/* Side panel */}
          <div className="space-y-4">
            {/* Simulator */}
            <Card className="border-border/60 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Wind className="h-4 w-4 text-primary" /> Simulador de deriva
                </div>
                <div className="flex items-center gap-2">
                  {climateLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                  {!climateLoading && climateSource === "nasa" && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <Satellite className="h-3 w-3" /> NASA · {climateDate}
                    </Badge>
                  )}
                  {!climateLoading && climateSource === "manual" && (
                    <Badge variant="outline" className="text-xs">Manual</Badge>
                  )}
                </div>
              </div>
              <div className="mt-5 space-y-5">
                <SliderField
                  icon={Wind} label="Viento" value={wind} max={40}
                  display={`${wind} km/h`} onChange={(v) => { setWind(v); setClimateSource("manual"); }}
                />
                <SliderField
                  icon={Compass} label="Dirección del viento" value={windDirection} max={360}
                  display={`${windDirection}°`} onChange={(v) => { setWindDirection(v); setClimateSource("manual"); }}
                  hint="Dirección meteorológica: el ángulo desde donde sopla."
                />
                <SliderField
                  icon={Droplets} label="Humedad" value={humidity} min={20} max={100}
                  display={`${humidity}%`} onChange={(v) => { setHumidity(v); setClimateSource("manual"); }}
                />
                <SliderField
                  icon={Thermometer} label="Temperatura" value={temperature} min={10} max={40}
                  display={`${temperature}°C`} onChange={(v) => { setTemperature(v); setClimateSource("manual"); }}
                />
                <SliderField
                  icon={Cloud} label="Cobertura de nubes" value={cloudCover} min={0} max={100}
                  display={`${cloudCover}%`} onChange={(v) => { setCloudCover(v); setClimateSource("manual"); }}
                  hint="Se usa para estimar la estabilidad Pasquill-Gifford."
                />
                <SliderField
                  icon={MoveVertical} label="Pendiente andina" value={slope} max={45}
                  display={`${slope}°`} onChange={(v) => { setSlope(v); setClimateSource("manual"); }}
                  hint="Efecto venturi andino · ICA Res. 740/2023, Art. 12"
                />
                <div className="space-y-2">
                  <Label>Tipo de aplicación</Label>
                  <Select value={applicationType} onValueChange={(value) => setApplicationType(value as ApplicationType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="terrestre">Terrestre · tractor / bomba de espalda</SelectItem>
                      <SelectItem value="aerea">Aérea · dron / avioneta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            {/* Assessment */}
            <Card className={`border p-5 ${assessment ? riskBg[assessment.level] : "border-border/60"}`}>
              <div className="text-xs font-semibold uppercase tracking-wider opacity-70">
                Evaluación · modelo gaussiano
              </div>
              <div className="mt-1 font-display text-2xl font-semibold capitalize">
                {assessment ? `Riesgo ${assessment.level}` : "Sin finca seleccionada"}
              </div>
              <div className="mt-3 space-y-1.5 text-sm">
                <Row label="Pluma máxima" value={`${(radius / 1000).toFixed(2)} km`} />
                <Row label="Margen de incertidumbre" value={`±${uncertainty} m`} />
                <Row label="Estabilidad" value={`Clase ${assessment?.stabilityClass ?? stabilityClass}`} />
                <Row
                  label="Apiarios en zona de riesgo"
                  value={assessment ? `${assessment.affected.length}` : "—"}
                />
                <Row label="Ventana óptima" value={window_.label} />
                {window_.horaInicio !== "Suspender aplicación" && (
                  <Row label="Horario" value={`${window_.horaInicio} — ${window_.horaFin}`} />
                )}
              </div>
              <div className="mt-3 border-t border-current/10 pt-3 text-xs opacity-60">
                Modelo de pluma gaussiana · Pasquill-Gifford · corrección topográfica ≥15°
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {selectedFinca && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      exportCertificatePdf({
                        finca: selectedFinca,
                        operador: { nombre: user.user_metadata.nombre, email: user.email },
                        condiciones: {
                          windKmh: wind,
                          humidity,
                          slopeDeg: slope,
                          fuente: climateSource === "nasa" ? "NASA POWER" : "Manual",
                          fecha: climateDate ?? new Date().toLocaleDateString("es-CO"),
                        },
                        evaluacion: {
                          nivel: assessment?.level ?? "bajo",
                          radioKm: (radius / 1000).toFixed(2),
                          incertidumbreM: uncertainty,
                          apiarios: assessment?.affected.length ?? 0,
                          ventana: window_.label,
                          horario: window_.horaInicio !== "Suspender aplicación"
                            ? `${window_.horaInicio} — ${window_.horaFin}`
                            : "—",
                        },
                      })
                    }
                  >
                    <FileDown className="mr-1.5 h-4 w-4" />
                    Exportar borrador RA-03
                  </Button>
                )}
                {selectedFinca && assessment && assessment.affected.length > 0 && (
                  <SmsPreviewDialog
                    finca={selectedFinca}
                    affected={assessment.affected as unknown as ApiarioRow[]}
                    wind={wind}
                    slope={slope}
                    window_={window_}
                    onSent={refresh}
                  />
                )}
              </div>
            </Card>

            {/* Quick link to Agente */}
            <Card className="border-border/60 p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div className="flex-1 text-sm">
                  <div className="font-medium">Consulta al Agente Regulatorio</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    ¿Dudas sobre LMR, SISPAP o cuarentena? La IA cita el artículo exacto.
                  </div>
                </div>
                <Button asChild variant="ghost" size="sm" className="shrink-0">
                  <Link to="/agente"><Bot className="h-4 w-4" /></Link>
                </Button>
              </div>
            </Card>
          </div>
        </div>

        {/* Lists */}
        <Tabs defaultValue="fincas">
          <TabsList>
            <TabsTrigger value="fincas">Mis fincas ({fincas.length})</TabsTrigger>
            <TabsTrigger value="apiarios">ColmenaSegura ({apiarios.length})</TabsTrigger>
            <TabsTrigger value="alertas">Alertas</TabsTrigger>
            <TabsTrigger value="nodos">Nodos IoT (4)</TabsTrigger>
          </TabsList>

          <TabsContent value="fincas" className="mt-4">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {fincas.map(f => (
                <Card
                  key={f.id}
                  onClick={() => setSelectedFincaId(f.id)}
                  className={`cursor-pointer border p-5 transition-all hover:shadow-[var(--shadow-elegant)] ${
                    selectedFincaId === f.id ? "border-primary ring-1 ring-primary" : "border-border/60"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Sprout className="h-5 w-5" />
                    </div>
                    {f.organica && <Badge variant="secondary">Orgánica</Badge>}
                  </div>
                  <h3 className="mt-3 font-display text-lg font-semibold">{f.nombre}</h3>
                  <p className="text-sm text-muted-foreground">{f.cultivo}</p>
                  <p className="mt-2 font-mono text-xs text-muted-foreground">
                    {f.latitud.toFixed(4)}, {f.longitud.toFixed(4)}
                  </p>
                </Card>
              ))}
              {fincas.length === 0 && <EmptyHint label="No tienes fincas aún." />}
            </div>
          </TabsContent>

          <TabsContent value="apiarios" className="mt-4">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {apiarios.map(a => (
                <Card key={a.id} className="border-border/60 p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15 text-accent-foreground">
                      <Hexagon className="h-5 w-5" />
                    </div>
                    {a.user_id === user.id && (
                      <DeleteApiarioBtn id={a.id} onDone={refresh} />
                    )}
                  </div>
                  <h3 className="mt-3 font-display text-lg font-semibold">{a.nombre}</h3>
                  <p className="text-sm text-muted-foreground">
                    {a.num_colmenas} colmenas · radio {a.radio_proteccion_m} m
                  </p>
                </Card>
              ))}
              {apiarios.length === 0 && <EmptyHint label="Aún no hay apiarios registrados." />}
            </div>
          </TabsContent>

          <TabsContent value="alertas" className="mt-4">
            <AlertasList userId={user.id} reloadKey={alertsReloadKey} />
          </TabsContent>
          <TabsContent value="nodos" className="mt-4">
            <NodesPanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// ─── SMS Preview Dialog ───────────────────────────────────────────────────────

function SmsPreviewDialog({
  finca, affected, wind, slope, window_, onSent,
}: {
  finca: FincaRow;
  affected: ApiarioRow[];
  wind: number;
  slope: number;
  window_: ReturnType<typeof optimalWindow>;
  onSent: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [smsResult, setSmsResult] = useState<{ sent: number; sinTelefono: number } | null>(null);

  const smsText = `[AgroSync] Alerta preventiva de deriva — Finca: "${finca.nombre}" (${finca.latitud.toFixed(4)}, ${finca.longitud.toFixed(4)}). Viento: ${wind} km/h | Pendiente: ${slope}°. Ventana segura: ${window_.horaInicio}. Apiarios afectados: ${affected.length}. Ref: ICA Res. 740/2023, Art. 23.`;

  const conTelefono = affected.filter(a => a.contacto_telefono);

  const handleSend = async () => {
    setSending(true);
    try {
      await createAlertas(affected.map(a => ({
        destinatario_id: a.user_id,
        tipo: "deriva",
        severidad: "alta",
        mensaje: smsText,
      })));

      if (conTelefono.length > 0) {
        const { data, error } = await supabase.functions.invoke("send-sms", {
          body: {
            destinatarios: conTelefono.map(a => ({ telefono: a.contacto_telefono!, nombre: a.nombre })),
            mensaje: smsText,
          },
        });
        if (error) {
          toast.warning("Alertas guardadas. SMS no enviado: " + error.message);
        } else {
          const r = data as { sent: number; sinTelefono: number };
          setSmsResult(r);
          toast.success(`${r.sent} SMS enviado${r.sent !== 1 ? "s" : ""} via Twilio`);
        }
      } else {
        toast.success(`Alertas guardadas · ${affected.length} registro(s) en base de datos`);
      }

      setSent(true);
      onSent();
      setTimeout(() => { setOpen(false); setSent(false); setSmsResult(null); }, 2000);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "No se pudieron enviar las alertas");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="mt-4 w-full">
          <AlertTriangle className="mr-1.5 h-4 w-4" />
          Enviar alertas preventivas ({affected.length})
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alertas preventivas de deriva</DialogTitle>
          <DialogDescription>
            Guarda el registro en base de datos y envía SMS a los apicultores con teléfono registrado.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Destinatarios ({affected.length} apiarios)
            </p>
            <div className="space-y-1.5">
              {affected.map(a => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-sm">
                  <span className="font-medium">{a.nombre}</span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{a.num_colmenas} colmenas</span>
                    {a.contacto_telefono
                      ? <Badge variant="secondary" className="text-[10px]">SMS ✓</Badge>
                      : <Badge variant="outline" className="text-[10px]">Sin tel.</Badge>
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Mensaje SMS ({smsText.length} chars)
            </p>
            <div className="rounded-xl border border-border/60 bg-muted/30 p-4 font-mono text-xs leading-relaxed">
              {smsText}
            </div>
          </div>
          {conTelefono.length === 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2.5 text-xs text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
              <span>Ningún apiario afectado tiene teléfono registrado. El registro quedará en base de datos pero no se enviará SMS.</span>
            </div>
          )}
          <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>Registro inmutable en Supabase. Fundamento: ICA Res. 740/2023, Art. 23.</span>
          </div>
          {smsResult && (
            <div className="rounded-lg border border-success/30 bg-success/10 px-3 py-2.5 text-xs text-success">
              ✓ {smsResult.sent} SMS enviado{smsResult.sent !== 1 ? "s" : ""} via Twilio
              {smsResult.sinTelefono > 0 && ` · ${smsResult.sinTelefono} sin teléfono`}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => void handleSend()} disabled={sending || sent}>
            {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {sent ? "Enviado ✓" : `Confirmar (${affected.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SliderField({
  icon: Icon, label, value, min = 0, max, display, hint, onChange,
}: {
  icon: any; label: string; value: number; min?: number; max: number;
  display: string; hint?: string; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <Label className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" /> {label}
        </Label>
        <span className="font-mono text-muted-foreground">{display}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={1} onValueChange={v => onChange(v[0])} />
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="opacity-80">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function EmptyHint({ label }: { label: string }) {
  return (
    <Card className="col-span-full border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
      {label}
    </Card>
  );
}

// ─── Dialogs ──────────────────────────────────────────────────────────────────

function NewFincaDialog({ userId, onCreated }: { userId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nombre: "", cultivo: "Aguacate Hass", latitud: "5.0689", longitud: "-75.5174", organica: false });
  const [polygonPath, setPolygonPath] = useState<GeoPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const polygonCentroid = useMemo(
    () => (polygonPath.length >= 3 ? centroidFromPolygon(polygonPath) : null),
    [polygonPath],
  );
  const polygonArea = useMemo(
    () => (polygonPath.length >= 3 ? approximateAreaHectares(polygonPath) : null),
    [polygonPath],
  );

  useEffect(() => {
    if (!polygonCentroid) return;
    setForm((current) => ({
      ...current,
      latitud: polygonCentroid.lat.toFixed(6),
      longitud: polygonCentroid.lng.toFixed(6),
    }));
  }, [polygonCentroid]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const latitud = polygonCentroid?.lat ?? parseFloat(form.latitud);
    const longitud = polygonCentroid?.lng ?? parseFloat(form.longitud);

    if (!Number.isFinite(latitud) || !Number.isFinite(longitud)) {
      toast.error("Ingresa coordenadas válidas para la finca.");
      return;
    }

    setLoading(true);
    void createFinca({
      user_id: userId,
      nombre: form.nombre,
      cultivo: form.cultivo,
      latitud,
      longitud,
      organica: form.organica,
      area_hectareas: polygonArea,
      poligono_geojson: polygonToGeoJson(polygonPath),
      certificaciones: [],
    })
      .then(() => {
        toast.success("Finca registrada");
        setPolygonPath([]);
        setOpen(false);
        onCreated();
      })
      .catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : "No se pudo registrar la finca");
      })
      .finally(() => setLoading(false));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><Plus className="mr-1 h-4 w-4" />Finca</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl" aria-describedby={undefined}>
        <DialogHeader><DialogTitle>Nueva finca</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Nombre"><Input required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></Field>
          <Field label="Cultivo"><Input required value={form.cultivo} onChange={e => setForm({ ...form, cultivo: e.target.value })} /></Field>
          <FincaDrawingField initialPath={polygonPath} onChange={setPolygonPath} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitud">
              <Input required value={form.latitud} readOnly={polygonPath.length >= 3} onChange={e => setForm({ ...form, latitud: e.target.value })} />
            </Field>
            <Field label="Longitud">
              <Input required value={form.longitud} readOnly={polygonPath.length >= 3} onChange={e => setForm({ ...form, longitud: e.target.value })} />
            </Field>
          </div>
          <p className="text-xs text-muted-foreground">
            Si delimitas la finca en Google Maps, el sistema calcula automáticamente el centroide y el área aproximada.
          </p>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NewApiarioDialog({ userId, onCreated }: { userId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nombre: "", latitud: "5.0689", longitud: "-75.5174", num_colmenas: "10", radio_proteccion_m: "3000", contacto_telefono: "" });
  const [loading, setLoading] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const latitud = parseFloat(form.latitud);
    const longitud = parseFloat(form.longitud);
    const numColmenas = parseInt(form.num_colmenas, 10);
    const radioProteccion = parseInt(form.radio_proteccion_m, 10);

    if (
      !Number.isFinite(latitud) ||
      !Number.isFinite(longitud) ||
      !Number.isFinite(numColmenas) ||
      !Number.isFinite(radioProteccion)
    ) {
      toast.error("Completa datos válidos para el apiario.");
      return;
    }

    setLoading(true);
    void createApiario({
      user_id: userId,
      nombre: form.nombre,
      latitud,
      longitud,
      num_colmenas: numColmenas,
      radio_proteccion_m: radioProteccion,
      contacto_telefono: form.contacto_telefono || null,
    })
      .then(() => {
        toast.success("Apiario registrado en ColmenaSegura");
        setOpen(false);
        onCreated();
      })
      .catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : "No se pudo registrar el apiario");
      })
      .finally(() => setLoading(false));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Hexagon className="mr-1 h-4 w-4" />Apiario
        </Button>
      </DialogTrigger>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader><DialogTitle>Registrar apiario · ColmenaSegura</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Nombre"><Input required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitud"><Input required value={form.latitud} onChange={e => setForm({ ...form, latitud: e.target.value })} /></Field>
            <Field label="Longitud"><Input required value={form.longitud} onChange={e => setForm({ ...form, longitud: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Colmenas"><Input type="number" required value={form.num_colmenas} onChange={e => setForm({ ...form, num_colmenas: e.target.value })} /></Field>
            <Field label="Radio (m)"><Input type="number" required value={form.radio_proteccion_m} onChange={e => setForm({ ...form, radio_proteccion_m: e.target.value })} /></Field>
          </div>
          <Field label="Teléfono para alertas SMS (E.164)">
            <Input type="tel" placeholder="+573001234567" value={form.contacto_telefono} onChange={e => setForm({ ...form, contacto_telefono: e.target.value })} />
          </Field>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Registrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

function DeleteApiarioBtn({ id, onDone }: { id: string; onDone: () => void }) {
  return (
    <Button
      onClick={() => {
        void deleteApiario(id)
          .then(() => {
            toast.success("Apiario eliminado");
            onDone();
          })
          .catch((error: unknown) => {
            toast.error(error instanceof Error ? error.message : "No se pudo eliminar el apiario");
          });
      }}
      size="icon" variant="ghost" className="h-8 w-8"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

function AlertasList({ userId, reloadKey }: { userId: string; reloadKey: number }) {
  const [items, setItems] = useState<AlertaRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    void getAlertas(userId)
      .then((rows) => {
        if (mounted) setItems(rows);
      })
      .catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : "No se pudieron cargar las alertas");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [userId, reloadKey]);

  if (loading) return <EmptyHint label="Cargando alertas..." />;
  if (items.length === 0) return <EmptyHint label="Sin alertas. Tu zona está despejada." />;
  return (
    <div className="space-y-2">
      {items.map(a => (
        <Card key={a.id} className="flex items-start gap-3 border-border/60 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Badge variant={a.severidad === "alta" ? "destructive" : "secondary"}>{a.severidad}</Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(a.created_at).toLocaleString("es-CO")}
              </span>
            </div>
            <p className="mt-1 text-sm">{a.mensaje}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── KPI Overview ─────────────────────────────────────────────────────────────

function KpiOverview({
  riskLevel,
  totalApiarios,
  affectedApiarios,
}: {
  riskLevel: "bajo" | "medio" | "alto" | "critico" | null;
  totalApiarios: number;
  affectedApiarios: number;
}) {
  const riskReduction =
    riskLevel === "critico" ? 10 :
    riskLevel === "alto"    ? 20 :
    riskLevel === "medio"   ? 55 : 85;
  const apiariosPct =
    totalApiarios > 0
      ? Math.round(((totalApiarios - affectedApiarios) / totalApiarios) * 100)
      : 100;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <KpiDonut
        value={riskReduction}
        label="Reducción de riesgo"
        sublabel="Contaminación cruzada por deriva"
        colorClass={riskReduction > 60 ? "text-emerald-500" : riskReduction > 30 ? "text-amber-500" : "text-destructive"}
      />
      <KpiDonut
        value={apiariosPct}
        label="Apiarios protegidos"
        sublabel={`${totalApiarios - affectedApiarios} de ${totalApiarios} en ColmenaSegura`}
        colorClass={apiariosPct > 80 ? "text-emerald-500" : apiariosPct > 50 ? "text-amber-500" : "text-destructive"}
      />
      <KpiDonut
        value={80}
        label="Trámites optimizados"
        sublabel="Tiempo ICA · SISPAP · DIAN"
        colorClass="text-violet-500"
      />
    </div>
  );
}

function KpiDonut({
  value,
  label,
  sublabel,
  colorClass,
}: {
  value: number;
  label: string;
  sublabel: string;
  colorClass: string;
}) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - value / 100);

  return (
    <Card className="border-border/60 p-5">
      <div className="flex items-center gap-4">
        <div className="relative h-20 w-20 shrink-0">
          <svg viewBox="0 0 100 100" className="-rotate-90 h-20 w-20">
            <circle cx="50" cy="50" r={r} fill="none" strokeWidth="10" className="stroke-muted" />
            <circle
              cx="50" cy="50" r={r} fill="none" strokeWidth="10"
              strokeLinecap="round"
              className={colorClass}
              style={{
                stroke: "currentColor",
                strokeDasharray: circ,
                strokeDashoffset: offset,
                transition: "stroke-dashoffset 0.8s ease",
              }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`font-display text-lg font-semibold ${colorClass}`}>{value}%</span>
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium leading-tight">{label}</div>
          <div className="mt-1 text-xs leading-tight text-muted-foreground">{sublabel}</div>
        </div>
      </div>
    </Card>
  );
}

// ─── IoT Nodos Centinela ──────────────────────────────────────────────────────

type NodeStatus = "ok" | "alerta" | "critico";

interface NodeData {
  id: string;
  ubicacion: string;
  windKmh: number;
  windGustKmh: number;
  windDirectionDeg: number;
  vocPpb: number;
  status: NodeStatus;
}

const BASE_NODES: NodeData[] = [
  { id: "N-01", ubicacion: "Perím. Norte", windKmh: 18.0, windGustKmh: 23.0, windDirectionDeg: 22,  vocPpb: 0.30, status: "ok"     },
  { id: "N-02", ubicacion: "Perím. Este",  windKmh: 15.0, windGustKmh: 19.0, windDirectionDeg: 70,  vocPpb: 0.12, status: "ok"     },
  { id: "N-03", ubicacion: "Perím. Sur",   windKmh: 12.0, windGustKmh: 16.0, windDirectionDeg: 210, vocPpb: 0.82, status: "alerta" },
  { id: "N-04", ubicacion: "Perím. Oeste", windKmh: 9.0,  windGustKmh: 13.0, windDirectionDeg: 255, vocPpb: 0.21, status: "ok"     },
];

function classifyNodeStatus(voc: number): NodeStatus {
  if (voc >= 1.5) return "critico";
  if (voc >= 0.5) return "alerta";
  return "ok";
}

function NodesPanel() {
  const [nodes, setNodes] = useState<NodeData[]>(BASE_NODES);

  useEffect(() => {
    const interval = setInterval(() => {
      setNodes(prev =>
        prev.map(n => {
          const newVoc    = Math.max(0.05, Math.min(3,  n.vocPpb      + (Math.random() - 0.5) * 0.12));
          const newWind   = Math.max(1,    Math.min(40, n.windKmh     + (Math.random() - 0.5) * 1.5));
          const newGust   = Math.max(newWind, Math.min(50, n.windGustKmh + (Math.random() - 0.5) * 2));
          return {
            ...n,
            windKmh:      Math.round(newWind  * 10) / 10,
            windGustKmh:  Math.round(newGust  * 10) / 10,
            vocPpb:       Math.round(newVoc   * 100) / 100,
            status:       classifyNodeStatus(newVoc),
          };
        }),
      );
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const alertCount = nodes.filter(n => n.status !== "ok").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Radio className="h-4 w-4 animate-pulse text-primary" />
          <span>Telemetría en tiempo real · actualiza cada 2.5 s</span>
        </div>
        {alertCount > 0 ? (
          <Badge variant="destructive">
            {alertCount} alerta{alertCount > 1 ? "s" : ""} activa{alertCount > 1 ? "s" : ""}
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-emerald-600">Todos los nodos normales</Badge>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {nodes.map(n => <NodeCard key={n.id} node={n} />)}
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-1.5 border-t border-border/40 pt-3 text-xs text-muted-foreground">
        <span>Sensores: Anemómetro ultrasónico 3D + Detector PID (VOC)</span>
        <span>Conectividad: LoRaWAN</span>
        <span>Umbral VOC: &lt;0.5 ppb Normal · 0.5–1.5 ppb Alerta · &gt;1.5 ppb Crítico</span>
      </div>
    </div>
  );
}

const STATUS_BORDER: Record<NodeStatus, string> = {
  ok:      "border-emerald-200/50 bg-emerald-50/30",
  alerta:  "border-amber-200/60   bg-amber-50/30",
  critico: "border-destructive/40 bg-destructive/5",
};
const STATUS_BADGE: Record<NodeStatus, "secondary" | "outline" | "destructive"> = {
  ok:      "secondary",
  alerta:  "outline",
  critico: "destructive",
};
const STATUS_LABEL: Record<NodeStatus, string> = { ok: "Normal", alerta: "Alerta", critico: "Crítico" };

function NodeCard({ node }: { node: NodeData }) {
  return (
    <Card className={`border p-5 transition-colors duration-500 ${STATUS_BORDER[node.status]}`}>
      <div className="flex items-start justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Cpu className="h-4 w-4 text-primary" />
        </div>
        <Badge variant={STATUS_BADGE[node.status]} className="text-xs">
          {STATUS_LABEL[node.status]}
        </Badge>
      </div>
      <div className="mt-3">
        <div className="font-mono text-xs font-semibold text-muted-foreground">{node.id}</div>
        <div className="font-display text-base font-semibold">{node.ubicacion}</div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground">Viento</div>
          <div className="font-mono text-2xl font-semibold leading-none">{node.windKmh.toFixed(1)}</div>
          <div className="text-xs text-muted-foreground">km/h</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Ráfagas: <span className="font-medium text-foreground">{node.windGustKmh.toFixed(1)} km/h</span>
          </div>
        </div>
        <WindCompass deg={node.windDirectionDeg} />
      </div>

      <div className="mt-4">
        <VocBar value={node.vocPpb} />
      </div>
    </Card>
  );
}

function WindCompass({ deg }: { deg: number }) {
  const dirs = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  const dirLabel = dirs[Math.round(deg / 45) % 8];

  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 56 56" className="h-14 w-14">
        <circle cx="28" cy="28" r="26" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-border" />
        <text x="28"  y="8"  textAnchor="middle" fontSize="6" className="fill-muted-foreground">N</text>
        <text x="28"  y="53" textAnchor="middle" fontSize="6" className="fill-muted-foreground">S</text>
        <text x="7"   y="31" textAnchor="middle" fontSize="6" className="fill-muted-foreground">O</text>
        <text x="50"  y="31" textAnchor="middle" fontSize="6" className="fill-muted-foreground">E</text>
        <g transform={`rotate(${deg}, 28, 28)`}>
          <polygon points="28,8 25,26 28,23 31,26"  className="fill-primary" />
          <polygon points="28,48 25,30 28,33 31,30" style={{ fill: "currentColor", opacity: 0.35 }} />
        </g>
      </svg>
      <span className="font-mono text-xs font-medium">{dirLabel} · {deg}°</span>
    </div>
  );
}

function VocBar({ value }: { value: number }) {
  const pct      = Math.min(100, (value / 3) * 100);
  const barColor = value < 0.5 ? "bg-emerald-500" : value < 1.5 ? "bg-amber-500" : "bg-destructive";
  const txtColor = value < 0.5 ? "text-emerald-600" : value < 1.5 ? "text-amber-600" : "text-destructive";

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">VOC (PID)</span>
        <span className={`font-mono text-xs font-semibold ${txtColor}`}>{value.toFixed(2)} ppb</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted/60">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
