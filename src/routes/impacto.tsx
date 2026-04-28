import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/impacto")({
  component: Impacto,
  head: () => ({
    meta: [
      { title: "Impacto — AgroSync" },
      { name: "description", content: "Impacto ambiental, económico y social de AgroSync en Colombia: polinizadores, exportaciones y diálogo territorial." },
    ],
  }),
});

const metricas = [
  { value: "60–85%", label: "Reducción de contaminación cruzada por deriva" },
  { value: "+20%", label: "Mayor eficacia química en ventana óptima" },
  { value: "−80%", label: "Tiempo de trámite fitosanitario (días → minutos)" },
  { value: "0", label: "Fincas cuarentenadas por residuos no intencionados" },
];

function Impacto() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Impacto</p>
          <h1 className="mt-3 text-5xl font-semibold sm:text-6xl">Lo que mejora cuando funciona</h1>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {metricas.map((m) => (
            <Card key={m.label} className="border-border/60 p-8 text-center">
              <div className="font-display text-5xl font-semibold text-primary">{m.value}</div>
              <div className="mt-3 text-sm text-muted-foreground">{m.label}</div>
            </Card>
          ))}
        </div>

        <div className="mt-20 grid gap-10 lg:grid-cols-3">
          <ImpactBlock title="Ambiental">
            Protege el motor biológico de Colombia. Preserva polinizadores y reduce
            la carga química en cuencas hídricas.
          </ImpactBlock>
          <ImpactBlock title="Económico">
            Blinda la industria exportadora frente a barreras internacionales y
            evita la quiebra por cuarentenas fitosanitarias.
          </ImpactBlock>
          <ImpactBlock title="Social">
            Justicia para apicultores. Empoderamiento del pequeño agricultor orgánico.
            Diálogo territorial donde antes había silencio.
          </ImpactBlock>
        </div>
      </section>
    </div>
  );
}

function ImpactBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-l-2 border-primary pl-6">
      <h3 className="font-display text-2xl font-semibold">{title}</h3>
      <p className="mt-3 leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}
