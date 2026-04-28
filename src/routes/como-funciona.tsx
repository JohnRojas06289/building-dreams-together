import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CloudRain, Database, Brain, FileCheck2, Radio, Satellite } from "lucide-react";

export const Route = createFileRoute("/como-funciona")({
  component: ComoFunciona,
  head: () => ({
    meta: [
      { title: "Cómo funciona — AgroSync" },
      { name: "description", content: "La arquitectura de AgroSync: gemelo digital atmosférico, agentes de IA con RAG sin alucinaciones e integración SISPAP." },
    ],
  }),
});

const sentidos = [
  { icon: Satellite, title: "Visión satelital", body: "Google Earth Engine para cobertura vegetal y modelos de elevación digital." },
  { icon: CloudRain, title: "Clima hiperlocal", body: "APIs del IDEAM y NASA + modelos topográficos andinos." },
  { icon: Database, title: "Vector legal", body: "Resoluciones ICA, normativa DIAN y Límites Máximos de Residuos vectorizados." },
  { icon: Radio, title: "Voz territorial", body: "Bot de WhatsApp con Speech-to-Text para apicultores rurales." },
  { icon: Brain, title: "Razonamiento", body: "5 dimensiones simultáneas: física, regulación, geografía, economía y cumplimiento." },
  { icon: FileCheck2, title: "Documentos", body: "Pre-llenado automático de borradores SISPAP y certificados fitosanitarios." },
];

function ComoFunciona() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Arquitectura</p>
          <h1 className="mt-3 text-5xl font-semibold sm:text-6xl">Cómo funciona AgroSync</h1>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            Un copiloto, no una caja negra. Cada decisión cita el PDF legal,
            mide su confianza y escala a revisión humana cuando es necesario.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sentidos.map((s) => (
            <Card key={s.title} className="border-border/60 p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <s.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </Card>
          ))}
        </div>

        <div className="mt-20 rounded-2xl border border-border/60 bg-muted/40 p-10 text-center">
          <h2 className="font-display text-3xl font-semibold">Sin alucinaciones, con citación obligatoria</h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Sistema RAG (Generación Aumentada por Recuperación) entrenado sobre
            la normativa colombiana e internacional. Cada respuesta incluye fuente
            legal verificable y nivel de confianza.
          </p>
          <Button asChild size="lg" className="mt-8">
            <Link to="/auth">Probar la plataforma</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
