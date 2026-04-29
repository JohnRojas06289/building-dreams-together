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
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({ meta: [{ title: "Ingresar — AgroSync" }] }),
});

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
          <Card className="border-border/60 p-8">
            <div className="mb-6 lg:hidden">
              <Link to="/"><Logo /></Link>
            </div>
            <div className="mb-6 rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
              Esta versión ya usa autenticación real con Supabase. Crea tu cuenta o ingresa con una existente.
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

const DEBUG_USERS = [
  { label: "Agricultor",  email: "agricultor@agrosync.demo", role: "Carlos Mendoza · exportador" },
  { label: "Apicultor",   email: "apicultor@agrosync.demo",  role: "María Torres · ColmenaSegura" },
  { label: "Técnico ICA", email: "tecnico@agrosync.demo",    role: "Andrés Ríos · asistente técnico" },
] as const;

const DEBUG_PASSWORD = "AgroSync2026!";

function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const doSignIn = async (em: string, pw: string) => {
    setLoading(true);
    const { error } = await authStore.signIn(em, pw);
    setLoading(false);
    if (error) { toast.error(error); return; }
    toast.success("Bienvenido de vuelta");
    navigate({ to: "/dashboard" });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    void doSignIn(email, password);
  };

  return (
    <div className="space-y-4">
      {/* ── DEBUG: acceso rápido ── */}
      <div className="rounded-lg border border-dashed border-amber-400/60 bg-amber-50/50 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-700">
          Debug — acceso rápido
        </p>
        <div className="flex flex-col gap-1.5">
          {DEBUG_USERS.map(u => (
            <button
              key={u.email}
              type="button"
              disabled={loading}
              onClick={() => void doSignIn(u.email, DEBUG_PASSWORD)}
              className="flex items-center justify-between rounded-md border border-amber-200 bg-white px-3 py-2 text-left text-xs transition-colors hover:bg-amber-50 disabled:opacity-50"
            >
              <span className="font-semibold text-amber-800">{u.label}</span>
              <span className="text-amber-600">{u.role}</span>
            </button>
          ))}
        </div>
      </div>

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
    </div>
  );
}

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
    const { user, error } = await authStore.signUp(email, password, nombre, tipo);
    setLoading(false);
    if (error) { toast.error(error); return; }
    if (!user) {
      toast.success("Cuenta creada. Revisa tu correo para confirmar el acceso.");
      return;
    }
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
