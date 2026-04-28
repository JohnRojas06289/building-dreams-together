import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ShieldCheck, Wind, MapPin, FileCheck2, Sparkles, AlertTriangle,
  ArrowRight, Bot, Globe2, Bell,
} from "lucide-react";
import heroImg from "@/assets/hero-andes.jpg";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "AgroSync — Cumplimiento Agroambiental con IA para Colombia" },
      { name: "description", content: "Predicción de deriva, protección de apiarios y certificados fitosanitarios automáticos. El primer Sistema Operativo de Cumplimiento Agroambiental." },
    ],
  }),
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImg}
            alt="Vista aérea de cultivos en los Andes colombianos"
            className="h-full w-full object-cover"
            width={1920}
            height={1088}
          />
          <div
            className="absolute inset-0"
            style={{ background: "var(--gradient-hero)" }}
          />
        </div>

        <div className="container relative mx-auto px-4 py-24 sm:py-32 lg:py-40">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium text-white backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5" />
              Sistema Operativo de Cumplimiento Agroambiental
            </div>
            <h1 className="mt-6 text-balance text-5xl font-semibold leading-[1.05] text-white sm:text-6xl lg:text-7xl">
              El viento no debería decidir si pierdes tu exportación.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/85">
              AgroSync predice la dispersión de agroquímicos, protege apiarios cercanos
              y genera tus certificados fitosanitarios en minutos. IA + clima andino +
              regulación ICA, en una sola decisión auditable.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/auth">
                  Empezar gratis <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/30 bg-white/10 text-white backdrop-blur-md hover:bg-white/20">
                <Link to="/como-funciona">Ver cómo funciona</Link>
              </Button>
            </div>
            <div className="mt-12 grid max-w-xl grid-cols-3 gap-6 text-white">
              <Stat value="−85%" label="Riesgo de deriva" />
              <Stat value="2 h" label="Anticipación de alertas" />
              <Stat value="−80%" label="Trámite fitosanitario" />
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="border-y border-border/60 bg-secondary/30 py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">El problema</p>
            <h2 className="mt-3 text-4xl font-semibold sm:text-5xl">Una crisis silenciosa de exportación</h2>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              La deriva de agroquímicos es invisible. Mata abejas, hace que Europa
              rechace contenedores por exceso de residuos, y deja predios en cuarentena
              bajo la Resolución 1806 del ICA. No por mala intención: por silencio técnico.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <ProblemCard icon={AlertTriangle} title="Cuarentenas inesperadas">
              Una sola fumigación vecina puede destruir toda una temporada de aguacate Hass o café de especialidad.
            </ProblemCard>
            <ProblemCard icon={Globe2} title="Rechazo en aduana">
              Contenedores devueltos en Rotterdam por superar Límites Máximos de Residuos.
            </ProblemCard>
            <ProblemCard icon={FileCheck2} title="Laberinto documental">
              ICA, SISPAP, DIAN: días de trámite manual donde un error pierde el embarque.
            </ProblemCard>
          </div>
        </div>
      </section>

      {/* Three steps */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">Efecto WOW</p>
            <h2 className="mt-3 text-4xl font-semibold sm:text-5xl">Tres pasos. Una decisión auditable.</h2>
          </div>
          <div className="mt-16 grid gap-8 lg:grid-cols-3">
            <StepCard
              n="01"
              icon={Wind}
              title="Gemelo Digital Atmosférico"
              body="Cruza datos meteorológicos del IDEAM, NASA y modelos de elevación para predecir la dispersión química — incluyendo el efecto venturi en pendientes andinas."
            />
            <StepCard
              n="02"
              icon={Bot}
              title="Arquitectura Multi-Agente"
              body="Agentes de IA evalúan en tiempo real clima, riesgo de deriva, y normativa ICA/DIAN/LMR sin alucinaciones. Siempre citan el PDF legal exacto."
            />
            <StepCard
              n="03"
              icon={Bell}
              title="Ventana óptima + alertas SMS"
              body="No prohíbe fumigar: indica la hora exacta. Si hay peligro, dispara SMS al agricultor, al vecino y al apicultor cercano. Todo queda en registro inmutable."
            />
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="border-t border-border/60 bg-muted/40 py-24">
        <div className="container mx-auto px-4">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-primary">ColmenaSegura</p>
              <h2 className="mt-3 text-4xl font-semibold sm:text-5xl">El primer mapa colaborativo de apiarios del país</h2>
              <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
                Apicultores registran sus colmenas vía web o WhatsApp. AgroSync calcula
                automáticamente zonas de protección y avisa antes de cualquier aplicación
                cercana. Convertimos el viento en un canal de diálogo territorial.
              </p>
              <ul className="mt-8 space-y-4">
                <Bullet icon={MapPin} text="Catastro georreferenciado de apiarios" />
                <Bullet icon={ShieldCheck} text="Radio de protección personalizado por colmena" />
                <Bullet icon={Bell} text="Alertas preventivas con 2 horas de anticipación" />
              </ul>
            </div>
            <Card className="overflow-hidden border-border/60 p-0 shadow-[var(--shadow-elegant)]">
              <div className="bg-gradient-to-br from-primary to-primary-glow p-8 text-primary-foreground">
                <div className="font-mono text-xs uppercase opacity-70">Decisión auditable</div>
                <div className="mt-2 font-display text-3xl font-semibold">Ventana óptima 05:30 — 07:45</div>
                <div className="mt-1 text-sm opacity-90">Viento 8 km/h · Humedad 78% · Riesgo bajo</div>
              </div>
              <div className="space-y-3 p-6 text-sm">
                <Row label="Apiarios cercanos" value="3 protegidos" />
                <Row label="Margen de incertidumbre" value="±240 m" />
                <Row label="Citación legal" value="Res. ICA 740/2023, Art. 12" />
                <Row label="Borrador SISPAP" value="Listo para firmar" highlight />
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div
            className="overflow-hidden rounded-3xl px-8 py-16 text-center text-primary-foreground sm:px-16"
            style={{ background: "var(--gradient-earth)" }}
          >
            <h2 className="text-balance text-4xl font-semibold sm:text-5xl">
              Únete al primer ecosistema de cumplimiento agroambiental
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg opacity-90">
              Agricultores, apicultores y técnicos: protejamos juntos la biodiversidad
              y la industria de exportación de Colombia.
            </p>
            <Button asChild size="lg" className="mt-10 bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/auth">Crear cuenta gratis <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 py-10 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} AgroSync · Tecnología para una agricultura transparente.
      </footer>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-display text-3xl font-semibold sm:text-4xl">{value}</div>
      <div className="mt-1 text-sm opacity-80">{label}</div>
    </div>
  );
}

function ProblemCard({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <Card className="border-border/60 p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 font-display text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{children}</p>
    </Card>
  );
}

function StepCard({ n, icon: Icon, title, body }: { n: string; icon: any; title: string; body: string }) {
  return (
    <Card className="group relative overflow-hidden border-border/60 p-8 transition-all hover:shadow-[var(--shadow-elegant)]">
      <div className="font-mono text-xs font-semibold tracking-widest text-primary/60">{n}</div>
      <div className="mt-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform group-hover:scale-110">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-6 font-display text-2xl font-semibold">{title}</h3>
      <p className="mt-3 leading-relaxed text-muted-foreground">{body}</p>
    </Card>
  );
}

function Bullet({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <li className="flex items-start gap-3">
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <span className="text-base text-foreground">{text}</span>
    </li>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 pb-3 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={highlight ? "font-semibold text-primary" : "font-medium"}>{value}</span>
    </div>
  );
}
