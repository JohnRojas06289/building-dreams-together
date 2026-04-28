import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
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
        <Link to="/"><Logo className="text-primary-foreground [&_span]:text-primary-foreground" /></Link>
        <div className="space-y-4 text-primary-foreground">
          <p className="font-display text-4xl font-semibold leading-tight">
            "Convertimos el viento en un canal de diálogo transparente."
          </p>
          <p className="opacity-80">— AgroSync, copiloto agroambiental</p>
        </div>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-12">
        <Card className="w-full max-w-md border-border/60 p-8">
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
  );
}

function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "Credenciales inválidas" : error.message);
      return;
    }
    toast.success("Bienvenido de vuelta");
    navigate({ to: "/dashboard" });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email-in">Correo</Label>
        <Input id="email-in" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pw-in">Contraseña</Label>
        <Input id="pw-in" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Ingresar
      </Button>
    </form>
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
    const redirectUrl = `${window.location.origin}/dashboard`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { nombre, tipo_usuario: tipo },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message.includes("already") ? "Este correo ya está registrado" : error.message);
      return;
    }
    toast.success("Cuenta creada. Revisa tu correo para confirmar.");
    navigate({ to: "/dashboard" });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nombre">Nombre</Label>
        <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
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
        <Input id="email-up" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pw-up">Contraseña</Label>
        <Input id="pw-up" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Crear cuenta
      </Button>
    </form>
  );
}
