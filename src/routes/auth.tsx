import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { authStore } from "@/lib/auth-store";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Loader2, Sprout, Hexagon, Wrench, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({ meta: [{ title: "Ingresar — AgroSync" }] }),
});

// ─── Dev quick-access ─────────────────────────────────────────────────────────

const DEV_USERS = [
  { email: "agricultor@agrosync.demo", password: "AgroSync2026!", label: "Agricultor", icon: Sprout },
  { email: "apicultor@agrosync.demo",  password: "AgroSync2026!", label: "Apicultor",  icon: Hexagon },
  { email: "tecnico@agrosync.demo",    password: "AgroSync2026!", label: "Técnico",    icon: Wrench },
  { email: "admin@agrosync.demo",      password: "AgroSync2026!", label: "Admin",      icon: ShieldCheck },
] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

function AuthPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate({ to: "/dashboard" });
  }, [user, navigate]);

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden bg-gradient-to-br from-primary to-primary-glow p-12 lg:flex lg:flex-col lg:justify-between">
        <Link to="/">
          <Logo className="text-primary-foreground [&_span]:text-primary-foreground" />
        </Link>
        <div className="space-y-4 text-primary-foreground">
          <p className="font-display text-4xl font-semibold leading-tight">
            "Convertimos el viento en un canal de diálogo transparente."
          </p>
          <p className="opacity-80">— AgroSync, copiloto agroambiental</p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-4">
          <DevPanel />

          <Card className="border-border/60 p-8">
            <div className="lg:hidden mb-6">
              <Link to="/"><Logo /></Link>
            </div>
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Ingresar</TabsTrigger>
                <TabsTrigger value="signup">Crear cuenta</TabsTrigger>
              </TabsList>
              <TabsContent value="signin" className="mt-6"><SignInForm /></TabsContent>
              <TabsContent value="signup" className="mt-6"><SignUpForm /></TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Dev panel ────────────────────────────────────────────────────────────────

function DevPanel() {
  const navigate = useNavigate();
  const [active, setActive] = useState<string | null>(null);

  const loginAs = (u: typeof DEV_USERS[number]) => {
    setActive(u.label);
    const { error } = authStore.signIn(u.email, u.password);
    setActive(null);
    if (error) { toast.error(error); return; }
    toast.success(`Sesión iniciada como ${u.label}`);
    navigate({ to: "/dashboard" });
  };

  return (
    <Card className="border-dashed border-amber-400/60 bg-amber-50/50 dark:bg-amber-950/20 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded bg-amber-400/20 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-400">
          DEMO
        </span>
        <span className="text-xs font-medium text-amber-800 dark:text-amber-300">
          Acceso rápido por rol
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {DEV_USERS.map(u => {
          const Icon = u.icon;
          return (
            <button
              key={u.label}
              onClick={() => loginAs(u)}
              disabled={active !== null}
              className="flex items-center gap-2 rounded-lg border border-amber-300/60 bg-white/80 px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-amber-50 disabled:opacity-50 dark:bg-white/5 dark:hover:bg-white/10"
            >
              {active === u.label
                ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-amber-600" />
                : <Icon className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              }
              <span className="text-foreground">{u.label}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] text-amber-700/70 dark:text-amber-400/60">
        Sin base de datos · datos en localStorage · funciona offline
      </p>
    </Card>
  );
}

// ─── Sign-in ──────────────────────────────────────────────────────────────────

function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = authStore.signIn(email, password);
    setLoading(false);
    if (error) { toast.error(error); return; }
    toast.success("Bienvenido de vuelta");
    navigate({ to: "/dashboard" });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email-in">Correo</Label>
        <Input id="email-in" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pw-in">Contraseña</Label>
        <Input id="pw-in" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Ingresar
      </Button>
    </form>
  );
}

// ─── Sign-up ──────────────────────────────────────────────────────────────────

function SignUpForm() {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tipo, setTipo] = useState("agricultor");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = authStore.signUp(email, password, nombre, tipo);
    setLoading(false);
    if (error) { toast.error(error); return; }
    toast.success("Cuenta creada");
    navigate({ to: "/dashboard" });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nombre">Nombre</Label>
        <Input id="nombre" value={nombre} onChange={e => setNombre(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tipo">Soy</Label>
        <Select value={tipo} onValueChange={setTipo}>
          <SelectTrigger id="tipo"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="agricultor">Agricultor / exportador</SelectItem>
            <SelectItem value="apicultor">Apicultor</SelectItem>
            <SelectItem value="tecnico">Asistente técnico</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email-up">Correo</Label>
        <Input id="email-up" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pw-up">Contraseña</Label>
        <Input id="pw-up" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Crear cuenta
      </Button>
    </form>
  );
}
