import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, Wind, Droplets, MapPin, Sprout, Hexagon, Trash2, ShieldCheck } from "lucide-react";
import { assessRisk, driftRadius, optimalWindow, riskBg, type Apiary, type Finca } from "@/lib/agrosync";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — AgroSync" }] }),
});

function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [fincas, setFincas] = useState<Finca[]>([]);
  const [apiarios, setApiarios] = useState<Apiary[]>([]);
  const [selectedFincaId, setSelectedFincaId] = useState<string | null>(null);
  const [wind, setWind] = useState(8);
  const [humidity, setHumidity] = useState(75);
  const [MapView, setMapView] = useState<any>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    // Lazy-load leaflet client-only
    import("@/components/RiskMap").then((m) => setMapView(() => m.RiskMap));
  }, []);

  const refresh = async () => {
    if (!user) return;
    const [fRes, aRes] = await Promise.all([
      supabase.from("fincas").select("*").order("created_at", { ascending: false }),
      supabase.from("apiarios").select("*"),
    ]);
    if (fRes.data) {
      setFincas(fRes.data as any);
      if (!selectedFincaId && fRes.data[0]) setSelectedFincaId(fRes.data[0].id);
    }
    if (aRes.data) setApiarios(aRes.data as any);
  };

  useEffect(() => { if (user) refresh(); /* eslint-disable-next-line */ }, [user]);

  const selectedFinca = useMemo(() => fincas.find((f) => f.id === selectedFincaId) ?? null, [fincas, selectedFincaId]);
  const assessment = useMemo(
    () => (selectedFinca ? assessRisk(selectedFinca, apiarios, wind, humidity) : null),
    [selectedFinca, apiarios, wind, humidity],
  );
  const window_ = useMemo(() => optimalWindow(wind), [wind]);
  const radius = useMemo(() => driftRadius(wind, humidity), [wind, humidity]);

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
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold">Centro de operaciones</h1>
            <p className="text-sm text-muted-foreground">Predice deriva, protege apiarios, planifica con datos.</p>
          </div>
          <div className="flex gap-2">
            <NewFincaDialog onCreated={refresh} />
            <NewApiarioDialog onCreated={refresh} />
          </div>
        </div>

        {fincas.length === 0 && apiarios.length === 0 && (
          <Card className="border-dashed border-border/60 bg-background p-10 text-center">
            <Sprout className="mx-auto h-10 w-10 text-primary" />
            <h2 className="mt-4 font-display text-2xl font-semibold">Empieza registrando</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Agrega tu primera finca o un apiario para activar el simulador de deriva y las alertas preventivas.
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
                  selectedFinca={selectedFinca}
                  driftRadius={radius}
                  affectedIds={new Set(assessment?.affected.map((a) => a.id) ?? [])}
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
            <Card className="border-border/60 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Wind className="h-4 w-4 text-primary" /> Simulador de deriva
              </div>
              <div className="mt-5 space-y-5">
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <Label>Viento</Label>
                    <span className="font-mono text-muted-foreground">{wind} km/h</span>
                  </div>
                  <Slider value={[wind]} max={40} step={1} onValueChange={(v) => setWind(v[0])} />
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <Label>Humedad</Label>
                    <span className="font-mono text-muted-foreground">{humidity}%</span>
                  </div>
                  <Slider value={[humidity]} min={20} max={100} step={1} onValueChange={(v) => setHumidity(v[0])} />
                </div>
              </div>
            </Card>

            {selectedFinca && assessment ? (
              <Card className={`border p-5 ${riskBg[assessment.level]}`}>
                <div className="text-xs font-semibold uppercase tracking-wider opacity-70">Evaluación</div>
                <div className="mt-1 font-display text-2xl font-semibold capitalize">Riesgo {assessment.level}</div>
                <div className="mt-3 space-y-1.5 text-sm">
                  <Row label="Radio de dispersión" value={`${(radius / 1000).toFixed(2)} km`} />
                  <Row label="Apiarios en zona" value={`${assessment.affected.length}`} />
                  <Row label="Ventana óptima" value={window_.label} />
                </div>
                {assessment.affected.length > 0 && (
                  <Button size="sm" className="mt-4 w-full" onClick={() => sendAlerts(selectedFinca, assessment.affected, refresh)}>
                    Enviar alertas preventivas ({assessment.affected.length})
                  </Button>
                )}
              </Card>
            ) : (
              <Card className="border-border/60 p-5 text-sm text-muted-foreground">
                Selecciona o crea una finca para ver la evaluación de riesgo.
              </Card>
            )}
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
              {fincas.map((f: any) => (
                <Card
                  key={f.id}
                  onClick={() => setSelectedFincaId(f.id)}
                  className={`cursor-pointer border p-5 transition-all hover:shadow-[var(--shadow-elegant)] ${selectedFincaId === f.id ? "border-primary ring-1 ring-primary" : "border-border/60"}`}
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
              {apiarios.map((a: any) => (
                <Card key={a.id} className="border-border/60 p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15 text-accent-foreground">
                      <Hexagon className="h-5 w-5" />
                    </div>
                    {a.user_id === user.id && <DeleteApiarioBtn id={a.id} onDone={refresh} />}
                  </div>
                  <h3 className="mt-3 font-display text-lg font-semibold">{a.nombre}</h3>
                  <p className="text-sm text-muted-foreground">{a.num_colmenas} colmenas · radio {a.radio_proteccion_m} m</p>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="opacity-80">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function EmptyHint({ label }: { label: string }) {
  return <Card className="col-span-full border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">{label}</Card>;
}

async function sendAlerts(finca: Finca, affected: Apiary[], refresh: () => void) {
  // Fetch destinatarios via apiario user_id
  const ids = Array.from(new Set(affected.map((a: any) => a.user_id).filter(Boolean)));
  if (ids.length === 0) {
    toast.info("Apiarios sin contacto registrado");
    return;
  }
  const rows = ids.map((destId) => ({
    destinatario_id: destId,
    tipo: "deriva",
    severidad: "alta",
    mensaje: `Riesgo de deriva detectado desde la finca "${finca.nombre}". Coordenadas ${finca.latitud.toFixed(4)}, ${finca.longitud.toFixed(4)}.`,
  }));
  const { error } = await supabase.from("alertas").insert(rows);
  if (error) toast.error(error.message);
  else { toast.success(`Alertas enviadas (${rows.length})`); refresh(); }
}

/* ========== Dialogs & lists ========== */

function NewFincaDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nombre: "", cultivo: "Aguacate Hass", latitud: "5.0689", longitud: "-75.5174", organica: false });
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("fincas").insert({
      user_id: user.id,
      nombre: form.nombre,
      cultivo: form.cultivo,
      latitud: parseFloat(form.latitud),
      longitud: parseFloat(form.longitud),
      organica: form.organica,
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else { toast.success("Finca registrada"); setOpen(false); onCreated(); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><Plus className="mr-1 h-4 w-4" />Finca</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nueva finca</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Nombre"><Input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></Field>
          <Field label="Cultivo"><Input required value={form.cultivo} onChange={(e) => setForm({ ...form, cultivo: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitud"><Input required value={form.latitud} onChange={(e) => setForm({ ...form, latitud: e.target.value })} /></Field>
            <Field label="Longitud"><Input required value={form.longitud} onChange={(e) => setForm({ ...form, longitud: e.target.value })} /></Field>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NewApiarioDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nombre: "", latitud: "5.0689", longitud: "-75.5174", num_colmenas: "10", radio_proteccion_m: "3000" });
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("apiarios").insert({
      user_id: user.id,
      nombre: form.nombre,
      latitud: parseFloat(form.latitud),
      longitud: parseFloat(form.longitud),
      num_colmenas: parseInt(form.num_colmenas),
      radio_proteccion_m: parseInt(form.radio_proteccion_m),
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else { toast.success("Apiario registrado en ColmenaSegura"); setOpen(false); onCreated(); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90"><Hexagon className="mr-1 h-4 w-4" />Apiario</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Registrar apiario · ColmenaSegura</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Nombre"><Input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitud"><Input required value={form.latitud} onChange={(e) => setForm({ ...form, latitud: e.target.value })} /></Field>
            <Field label="Longitud"><Input required value={form.longitud} onChange={(e) => setForm({ ...form, longitud: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Colmenas"><Input type="number" required value={form.num_colmenas} onChange={(e) => setForm({ ...form, num_colmenas: e.target.value })} /></Field>
            <Field label="Radio (m)"><Input type="number" required value={form.radio_proteccion_m} onChange={(e) => setForm({ ...form, radio_proteccion_m: e.target.value })} /></Field>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Registrar</Button>
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
  const del = async () => {
    const { error } = await supabase.from("apiarios").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Apiario eliminado"); onDone(); }
  };
  return <Button onClick={del} size="icon" variant="ghost" className="h-8 w-8"><Trash2 className="h-4 w-4" /></Button>;
}

function AlertasList({ userId }: { userId: string }) {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("alertas").select("*").eq("destinatario_id", userId).order("created_at", { ascending: false }).then(({ data }) => setItems(data ?? []));
  }, [userId]);
  if (items.length === 0) return <EmptyHint label="Sin alertas. Tu zona está despejada." />;
  return (
    <div className="space-y-2">
      {items.map((a) => (
        <Card key={a.id} className="flex items-start gap-3 border-border/60 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Badge variant={a.severidad === "alta" ? "destructive" : "secondary"}>{a.severidad}</Badge>
              <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString("es-CO")}</span>
            </div>
            <p className="mt-1 text-sm">{a.mensaje}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}
