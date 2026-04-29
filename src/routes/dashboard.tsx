import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Satellite, FileDown,
} from "lucide-react";
import {
  assessRisk, driftRadius, driftUncertainty, optimalWindow, riskBg,
  type Apiary, type Finca,
} from "@/lib/agrosync";
import {
  getFincas, createFinca, getApiarios, createApiario, deleteApiario,
  getAlertas, createAlertas, type FincaRow, type ApiarioRow,
} from "@/lib/store";
import { fetchAllClimate } from "@/lib/climate-api";
import { exportCertificatePdf } from "@/lib/pdf-export";

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
  const [humidity, setHumidity] = useState(75);
  const [slope, setSlope] = useState(15);
  const [climateSource, setClimateSource] = useState<"manual" | "nasa">("manual");
  const [climateLoading, setClimateLoading] = useState(false);
  const [climateDate, setClimateDate] = useState<string | null>(null);
  const [MapView, setMapView] = useState<any>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    import("@/components/RiskMap").then(m => setMapView(() => m.RiskMap));
  }, []);

  const refresh = () => {
    if (!user) return;
    const f = getFincas(user.id);
    setFincas(f);
    if (!selectedFincaId && f[0]) setSelectedFincaId(f[0].id);
    setApiarios(getApiarios());
  };

  useEffect(() => { if (user) refresh(); }, [user]); // eslint-disable-line

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
        setHumidity(climate.humidity);
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

  const assessment = useMemo(
    () => fincaForCalc ? assessRisk(fincaForCalc, apiariosForCalc, wind, humidity, slope) : null,
    [fincaForCalc, apiariosForCalc, wind, humidity, slope],
  );
  const window_ = useMemo(() => optimalWindow(wind, slope), [wind, slope]);
  const radius   = useMemo(() => driftRadius(wind, humidity, slope), [wind, humidity, slope]);
  const uncertainty = useMemo(() => driftUncertainty(radius, slope), [radius, slope]);

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
                  icon={Droplets} label="Humedad" value={humidity} min={20} max={100}
                  display={`${humidity}%`} onChange={(v) => { setHumidity(v); setClimateSource("manual"); }}
                />
                <SliderField
                  icon={MoveVertical} label="Pendiente andina" value={slope} max={45}
                  display={`${slope}°`} onChange={(v) => { setSlope(v); setClimateSource("manual"); }}
                  hint="Efecto venturi andino · ICA Res. 740/2023, Art. 12"
                />
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
                <Row label="Radio de dispersión" value={`${(radius / 1000).toFixed(2)} km`} />
                <Row label="Margen de incertidumbre" value={`±${uncertainty} m`} />
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
                Citación: Res. ICA 740/2023, Art. 12 · Modelo IDEAM coef. variación
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
            <AlertasList userId={user.id} />
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

  const smsText = `[AgroSync] Alerta preventiva de deriva — Finca: "${finca.nombre}" (${finca.latitud.toFixed(4)}, ${finca.longitud.toFixed(4)}). Viento: ${wind} km/h | Pendiente: ${slope}°. Ventana segura: ${window_.horaInicio}. Apiarios afectados: ${affected.length}. Ref: ICA Res. 740/2023, Art. 23.`;

  const handleSend = () => {
    setSending(true);
    const rows = affected.map(a => ({
      destinatario_id: a.user_id,
      tipo: "deriva",
      severidad: "alta",
      mensaje: smsText,
    }));
    createAlertas(rows);
    setSending(false);
    setSent(true);
    toast.success(`Alertas enviadas a ${affected.length} apicultor(es)`);
    onSent();
    setTimeout(() => { setOpen(false); setSent(false); }, 1800);
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
          <DialogTitle>Previsualización de alerta SMS</DialogTitle>
          <DialogDescription>
            Verifica el mensaje antes de enviarlo a los apicultores afectados.
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
                  <span className="text-xs text-muted-foreground">{a.num_colmenas} colmenas</span>
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
          <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>Registro inmutable. Fundamento: ICA Res. 740/2023, Art. 23.</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSend} disabled={sending || sent}>
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
  const [loading, setLoading] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    createFinca({
      user_id: userId,
      nombre: form.nombre,
      cultivo: form.cultivo,
      latitud: parseFloat(form.latitud),
      longitud: parseFloat(form.longitud),
      organica: form.organica,
      certificaciones: [],
    });
    setLoading(false);
    toast.success("Finca registrada");
    setOpen(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><Plus className="mr-1 h-4 w-4" />Finca</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nueva finca</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Nombre"><Input required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></Field>
          <Field label="Cultivo"><Input required value={form.cultivo} onChange={e => setForm({ ...form, cultivo: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitud"><Input required value={form.latitud} onChange={e => setForm({ ...form, latitud: e.target.value })} /></Field>
            <Field label="Longitud"><Input required value={form.longitud} onChange={e => setForm({ ...form, longitud: e.target.value })} /></Field>
          </div>
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
  const [form, setForm] = useState({ nombre: "", latitud: "5.0689", longitud: "-75.5174", num_colmenas: "10", radio_proteccion_m: "3000" });
  const [loading, setLoading] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    createApiario({
      user_id: userId,
      nombre: form.nombre,
      latitud: parseFloat(form.latitud),
      longitud: parseFloat(form.longitud),
      num_colmenas: parseInt(form.num_colmenas),
      radio_proteccion_m: parseInt(form.radio_proteccion_m),
    });
    setLoading(false);
    toast.success("Apiario registrado en ColmenaSegura");
    setOpen(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Hexagon className="mr-1 h-4 w-4" />Apiario
        </Button>
      </DialogTrigger>
      <DialogContent>
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
      onClick={() => { deleteApiario(id); toast.success("Apiario eliminado"); onDone(); }}
      size="icon" variant="ghost" className="h-8 w-8"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

function AlertasList({ userId }: { userId: string }) {
  const items = getAlertas(userId);
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
