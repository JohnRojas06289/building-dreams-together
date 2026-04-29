import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Send, Bot, User, ShieldCheck, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/agente")({
  component: AgentePage,
  head: () => ({
    meta: [
      { title: "Agente Regulatorio — AgroSync" },
      {
        name: "description",
        content:
          "Consulta el marco regulatorio ICA, DIAN y LMR con IA. Citación legal obligatoria, sin alucinaciones.",
      },
    ],
  }),
});

// ─── Regulatory RAG context ──────────────────────────────────────────────────
// Embedded normative fragments (simulates vector search over legal corpus).
// In production this is replaced by Vertex AI Vector Search over the full
// ICA / DIAN / Codex Alimentarius document collection.
const REGULATORY_CONTEXT = `
CONTEXTO REGULATORIO COLOMBIA — BASE NORMATIVA AGROSYNC
Fuente: ICA, DIAN, INVIMA, MADS, Codex Alimentarius, Reglamento UE (vigente 2023-2026)

════════════════════════════════════════
I. NORMATIVA ICA — PLAGUICIDAS
════════════════════════════════════════

[ICA RESOLUCIÓN 740 DE 2023 — PLAGUICIDAS QUÍMICOS]
Art. 1 — Objeto: Establece requisitos para registro, comercialización y uso seguro de plaguicidas químicos de uso agrícola en Colombia.
Art. 5 — Registro de plaguicidas: Todo plaguicida debe tener registro ICA vigente. Prohibido usar productos vencidos o sin registro. Renovación cada 5 años.
Art. 12 — Restricciones de aplicación por viento:
  · Organofosforados y neonicotinoides: prohibido con viento >15 km/h en terreno plano.
  · En pendientes >20°: prohibido con viento >10 km/h (efecto venturi andino).
  · Distancia mínima a apiarios registrados: 500 m (líquidos), 300 m (granulados).
  · Distancia mínima a fuentes hídricas: 30 m (corrientes permanentes), 10 m (temporales).
Art. 15 — Equipos de aplicación: Deben estar calibrados y certificados. Revisión técnica mínimo anual. Boquillas antigoteo obligatorias para aplicaciones aéreas.
Art. 18 — Registro de aplicaciones: Obligatorio dentro de 24 horas en SISPAP para predios con certificación de exportación. Incluir: producto, dosis, lote, condiciones meteorológicas, operador con carnet ICA.
Art. 23 — Responsabilidad civil por deriva: El agricultor emisor responde solidariamente por daños a predios vecinos, apiarios registrados y cultivos orgánicos certificados. La prueba de cumplimiento de Art. 12 exime de responsabilidad.
Art. 28 — Manejo de envases: Obligatorio triple lavado y entrega en puntos de recolección autorizados (CAMPO LIMPIO). Multa hasta 100 SMMLV por disposición inadecuada.
Art. 31 — Sanciones: Multas de hasta 200 SMMLV y suspensión del registro fitosanitario.

[ICA RESOLUCIÓN 3759 DE 2003 — BUENAS PRÁCTICAS AGRÍCOLAS]
Art. 6 — BPA obligatorias para predios exportadores. Incluye: registros escritos de todas las aplicaciones, capacitación de operadores, almacenamiento seguro de agroquímicos.
Art. 14 — Período de carencia: Respetar el intervalo de seguridad (días entre última aplicación y cosecha) especificado en la etiqueta de cada producto.

[ICA RESOLUCIÓN 1806 DE 2004 — CUARENTENA VEGETAL]
Art. 4 — Cuarentena por incumplimiento LMR: El ICA puede declarar cuarentena en predios con residuos excedidos en cosechas de exportación.
Art. 7 — Cuarentena implica suspensión inmediata de movimiento vegetal por mínimo 30 días hábiles.
Art. 9 — Notificación: El agricultor debe notificar al ICA dentro de 48 horas si detecta incumplimiento de LMR en análisis propios.
Art. 12 — Levantamiento de cuarentena: Requiere laboratorio acreditado ISO 17025 con resultado negativo para los residuos que motivaron la medida.

════════════════════════════════════════
II. LÍMITES MÁXIMOS DE RESIDUOS (LMR)
════════════════════════════════════════

[LMR AGUACATE HASS — Exportación UE (Reg. CE 2023/334 + Reg. CE 396/2005)]
  - Clorpirifós: 0.01 mg/kg (límite UE vigente desde Ene 2020 — más estricto que Codex)
  - Clorpirifós-metil: 0.01 mg/kg
  - Imidacloprid: 0.05 mg/kg
  - Glifosato: 0.1 mg/kg
  - Cobre (fungicidas cúpricos): 5 mg/kg
  - Azoxistrobina: 1 mg/kg
  - Propiconazol: 0.3 mg/kg
  - Lambda-cihalotrina: 0.1 mg/kg
  ALERTA: La UE aplica el principio de "límite de determinación" (0.01 mg/kg) para sustancias prohibidas. Un solo resultado positivo puede bloquear exportaciones del predio por 1 año.

[LMR AGUACATE HASS — Exportación USA (EPA/USDA)]
  - Clorpirifós: 0.5 mg/kg (más permisivo que UE)
  - Imidacloprid: 0.5 mg/kg
  - Abamectina: 0.02 mg/kg

[LMR CAFÉ — Exportación mundial (Codex Alimentarius CAC/MRL 2-2023)]
  - Endosulfán: No detectable (ND) — prohibido ICA desde 2019
  - Clorpirifós: 0.05 mg/kg (café verde)
  - Carbendazim + benomilo: 0.1 mg/kg (suma de residuos)
  - Cipermetrina: 0.05 mg/kg
  - Glifosato: 1 mg/kg (café verde sin tostar)

[LMR FLORES DE CORTE — Exportación USA (EPA FIFRA)]
  - Abamectina: 0.09 ppm
  - Spiromesifen: 1.5 ppm
  - Bifentrina: 0.5 ppm
  - Espinetoram: 0.5 ppm
  NOTA: USA exige Certificado de Conformidad con USDA APHIS antes del embarque.

[LMR PLÁTANO / BANANO — Exportación UE]
  - Tiabendazol: 3 mg/kg
  - Imazalil: 2 mg/kg
  - Clorpirifós: 0.01 mg/kg
  - Etileno (madurador): regulado como BPA, no como LMR

════════════════════════════════════════
III. SISPAP Y CERTIFICACIÓN FITOSANITARIA
════════════════════════════════════════

[SISPAP — Sistema de Información de Sanidad Agropecuaria y Pesquera]
Portal oficial: afrodita.ica.gov.co
Módulos relevantes: Registro de Predios, Aplicaciones de Agroquímicos, Solicitud CF-01.

Documentos requeridos para exportación:
  1. CF-01 (Certificado Fitosanitario): Válido 30 días. Firma de inspector ICA habilitado.
     Costo: aproximado $180.000 COP por certificado.
  2. RA-03 (Registro de Aplicaciones): Historial de agroquímicos 90 días previos a cosecha.
     AgroSync pre-llena RA-03 automáticamente desde historial de aplicaciones.
  3. PEP (Protocolo Específico de País): Obligatorio para UE, USA, Japón, Corea del Sur, China.
     Descarga disponible en portal Afrodita por especie y país destino.
  4. Análisis de residuos: Laboratorio acreditado ISO 17025. Resultados válidos 90 días.
     Laboratorios reconocidos: AGROSAVIA, CORPOICA, Colfoquímica, SGS Colombia.

Tiempo de trámite:
  - Sin automatización: 3-5 días hábiles (promedio histórico MADR 2022).
  - Con AgroSync: estimado 20-45 minutos (pre-llenado + validación automática).

════════════════════════════════════════
IV. NORMATIVA DIAN — EXPORTACIÓN AGROALIMENTARIA
════════════════════════════════════════

[DIAN — PROCEDIMIENTOS ADUANEROS]
Posiciones arancelarias clave:
  - Aguacate Hass fresco: 0804.40.00.00
  - Café verde sin tostar: 0901.11.00.00
  - Café tostado sin descafeinar: 0901.21.00.00
  - Flores de corte frescas (rosas): 0603.11.00.00
  - Flores de corte frescas (otras): 0603.19.00.00
  - Plátano fresco: 0803.90.11.00
  - Cacao en grano: 1801.00.00.00

Documentos mínimos exportación (sistema MUISCA/SYGA DIAN):
  1. Certificado Fitosanitario ICA CF-01 (obligatorio)
  2. Factura Comercial con Incoterm especificado
  3. Lista de Empaque (Packing List)
  4. Declaración de Exportación (DEX) — sistema SYGA
  5. Certificado de Origen para TLC (UE: EUR.1 o Declaración en Factura; USA: certificación ATPA)
  6. Guía de transporte (AWB aéreo o BL marítimo)

Drawback: Exportadores pueden solicitar devolución de aranceles pagados en insumos importados (Decreto 1165/2019 Art. 259). Trámite en DIAN vía sistema MUISCA.

════════════════════════════════════════
V. NORMATIVA AMBIENTAL — MADS / ANLA
════════════════════════════════════════

[DECRETO 1376 DE 2013 — PERMISO USO DE AGUA]
Predios que usan fuentes hídricas para riego deben tener concesión de agua vigente ante la CAR territorial. Renovación cada 10 años. Sin concesión, multa hasta 5.000 SMMLV (Ley 1333/2009).

[RESOLUCIÓN MADS 2115 DE 2007 — CALIDAD DEL AGUA]
Establece parámetros de calidad para agua de riego. El uso de aguas contaminadas con residuos de plaguicidas para irrigación de cultivos de exportación puede invalidar la certificación fitosanitaria.

[DECRETO 1843 DE 1991 — FUMIGACIÓN AÉREA]
Art. 44 — Fumigación aérea requiere licencia de operación del INVIMA y autorización del ICA por predio.
Art. 47 — Prohíbe fumigación aérea en zonas de amortiguamiento de resguardos indígenas y áreas naturales protegidas.
Art. 52 — Distancia mínima de fumigación aérea a poblaciones: 2 km.

════════════════════════════════════════
VI. PROTECCIÓN DE POLINIZADORES — NORMATIVA ESPECÍFICA
════════════════════════════════════════

[ICA CIRCULAR 007 DE 2019 — PROTECCIÓN ABEJAS]
- Restricción de uso de neonicotinoides (imidacloprid, tiametoxam, clotianidina) en cultivos en floración.
- Prohibición de aplicación entre las 06:00 y las 18:00 cuando el cultivo está en floración.
- Obligatorio notificar a apicultores registrados en un radio de 3 km con mínimo 48 horas de anticipación.

[LEY 1968 DE 2019 — PROTECCIÓN POLINIZADORES]
Art. 3 — Declara a las abejas y demás polinizadores como patrimonio natural estratégico de Colombia.
Art. 5 — El MADS y el ICA desarrollarán el Plan Nacional de Protección de Polinizadores.
Art. 7 — Las autoridades ambientales deben mantener un registro de apiarios para efectos de planificación territorial y protección frente a eventos de deriva.

════════════════════════════════════════
VII. AGRICULTURA ORGÁNICA Y CERTIFICACIONES
════════════════════════════════════════

[RESOLUCIÓN ICA 187 DE 2006 — PRODUCCIÓN ORGÁNICA]
Art. 8 — Período de transición: 2 años para cultivos anuales, 3 años para perennes antes de poder certificar como orgánico.
Art. 12 — Prohíbe el uso de cualquier plaguicida sintético en predios en certificación orgánica.
Art. 15 — Contaminación cruzada por deriva: Si un predio orgánico recibe deriva documentada de plaguicidas sintéticos, puede perder la certificación. El responsable de la deriva asume los costos de re-certificación.
Art. 20 — Organismos certificadores reconocidos en Colombia: BCS Colombia, CERES, IMO Control, Kiwa SKAL.

[REGLAMENTO UE 848/2018 — PRODUCTOS ORGÁNICOS IMPORTADOS]
Exige certificado de inspección (modelo COI) emitido por organismo de control reconocido por la UE. Colombia está incluida en la lista de países terceros equivalentes para café, cacao, frutas tropicales.
`;

const SYSTEM_PROMPT = `Eres el Agente Regulatorio de AgroSync, un asistente especializado en normativa fitosanitaria, aduanera y agroambiental de Colombia.

REGLAS ABSOLUTAS (no negociables):
1. SIEMPRE cita la fuente legal exacta al final de cada afirmación normativa usando el formato: [Res. ICA 740/2023, Art. 12] o [LMR Codex / UE Reg. 2023/334].
2. SIEMPRE indica tu nivel de confianza: Alta (>85%), Media (60-85%), Baja (<60%).
3. Si tu confianza es Baja, DEBES escalar: "Recomiendo verificar con un inspector ICA certificado."
4. NUNCA inventes cifras, plazos o artículos. Si no está en el contexto, dilo explícitamente.
5. Responde en español. Sé conciso y técnico pero claro.
6. Cuando el usuario pregunte sobre un caso específico, aplica la normativa al caso concreto.

CONTEXTO REGULATORIO DISPONIBLE:
${REGULATORY_CONTEXT}

Cuando respondas, estructura así (si aplica):
- Respuesta directa a la pregunta
- Fundamento legal [citación]
- Consecuencias prácticas
- Nivel de confianza: Alta / Media / Baja
- Acción recomendada en AgroSync (si aplica)`;

// ─── Types ───────────────────────────────────────────────────────────────────

interface Message {
  role: "user" | "assistant";
  content: string;
}

const EXAMPLE_QUESTIONS = [
  "¿Cuál es la distancia mínima de fumigación cerca a un apiario?",
  "¿Qué documentos necesito para exportar aguacate Hass a Europa?",
  "¿Con qué viento máximo puedo fumigar en una finca con pendiente de 25°?",
  "¿Cuáles son los LMR de clorpirifós para exportación a la UE?",
];

// ─── Gemini API call ─────────────────────────────────────────────────────────

async function callGemini(messages: Message[]): Promise<string> {
  const { data, error } = await supabase.functions.invoke("gemini-proxy", {
    body: {
      messages,
      systemPrompt: SYSTEM_PROMPT,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.text) {
    throw new Error(data?.error ?? "Sin respuesta del proxy Gemini.");
  }

  return data.text as string;
}

// ─── Component ───────────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  const lines = msg.content.split("\n");

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-primary text-primary-foreground" : "bg-muted border border-border/60"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4 text-primary" />}
      </div>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-muted/60 border border-border/40 text-foreground rounded-tl-sm"
        }`}
      >
        {isUser ? (
          msg.content
        ) : (
          <div className="space-y-1">
            {lines.map((line, index) => (
              <p key={`${line}-${index}`} className="whitespace-pre-wrap break-words">
                {line.split(/(\*\*.*?\*\*)/g).map((chunk, chunkIndex) => {
                  if (chunk.startsWith("**") && chunk.endsWith("**")) {
                    return <strong key={chunkIndex}>{chunk.slice(2, -2)}</strong>;
                  }
                  return chunk;
                })}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function AgentePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hola. Soy el **Agente Regulatorio de AgroSync**.\n\nPuedo responder consultas sobre normativa ICA, LMR de exportación, requisitos SISPAP/DIAN y restricciones de aplicación en terreno andino. Cada respuesta incluye citación legal y nivel de confianza.\n\n¿Cuál es tu consulta?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isThinking) return;

    const userMsg: Message = { role: "user", content: trimmed };
    const nextMessages: Message[] = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setIsThinking(true);

    try {
      const reply = await callGemini(nextMessages);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Error desconocido";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `⚠ Error al contactar la API: ${errMsg}` },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <Navbar />

      <main className="container mx-auto flex flex-1 flex-col gap-4 px-4 py-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold">Agente Regulatorio</h1>
            <p className="text-sm text-muted-foreground">
              IA con citación legal obligatoria · ICA · DIAN · LMR · SISPAP
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              RAG sobre normativa colombiana
            </Badge>
            <Badge variant="outline" className="gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-warning" />
              No reemplaza asesoría legal
            </Badge>
          </div>
        </div>

        {/* Chat area */}
        <Card className="flex flex-1 flex-col border-border/60 overflow-hidden" style={{ minHeight: "520px" }}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((m, i) => (
              <MessageBubble key={i} msg={m} />
            ))}

            {isThinking && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted border border-border/60">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-muted/60 border border-border/40 px-4 py-3">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Consultando normativa...
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Example questions (only before first user message) */}
          {messages.length === 1 && (
            <div className="border-t border-border/40 px-6 pb-4 pt-3">
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                Preguntas frecuentes
              </p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="rounded-full border border-border/60 bg-background px-3 py-1.5 text-xs hover:bg-muted transition-colors text-left"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-border/40 p-4">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
            >
              <input
                className="flex-1 rounded-xl border border-border/60 bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground"
                placeholder="Consulta sobre ICA, LMR, SISPAP, DIAN..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isThinking}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isThinking}
                className="h-10 w-10 shrink-0"
              >
                {isThinking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Powered by Gemini 2.5 Flash vía Supabase Edge Function · ICA Res. 740/2023 · Res. 1806/2004 · Res. 3759/2003 · Ley 1968/2019 · LMR Codex/UE/USA · SISPAP · DIAN · MADS
            </p>
          </div>
        </Card>
      </main>
    </div>
  );
}
