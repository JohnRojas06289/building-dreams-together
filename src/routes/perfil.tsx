import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/hooks/use-auth";
import { authStore } from "@/lib/auth-store";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, User, Mail, ShieldCheck, Trash2 } from "lucide-react";

export const Route = createFileRoute("/perfil")({
  component: PerfilPage,
  head: () => ({ meta: [{ title: "Mi perfil — AgroSync" }] }),
});

const ROL_LABELS: Record<string, string> = {
  agricultor: "Agricultor / exportador",
  apicultor: "Apicultor",
  tecnico: "Asistente técnico",
};

function PerfilPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

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
      <main className="container mx-auto max-w-2xl space-y-6 px-4 py-10">
        <div>
          <h1 className="font-display text-3xl font-semibold">Mi perfil</h1>
          <p className="text-sm text-muted-foreground">Gestiona tu información y cuenta</p>
        </div>
        <DatosBasicosCard user={user} />
        <EliminarCuentaCard />
      </main>
    </div>
  );
}

function DatosBasicosCard({ user }: { user: NonNullable<ReturnType<typeof useAuth>["user"]> }) {
  const [nombre, setNombre] = useState(user.user_metadata.nombre ?? "");
  const [tipo, setTipo] = useState(user.user_metadata.tipo_usuario ?? "agricultor");
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ nombre, tipo_usuario: tipo })
        .eq("id", user.id);

      if (error) throw new Error(error.message);

      await supabase.auth.updateUser({ data: { nombre, tipo_usuario: tipo } });
      toast.success("Perfil actualizado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar el perfil");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-border/60 p-6">
      <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Datos básicos
      </h2>
      <form onSubmit={save} className="space-y-4">
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Correo
          </Label>
          <Input value={user.email} readOnly className="bg-muted/40 text-muted-foreground" />
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-muted-foreground" /> Nombre
          </Label>
          <Input value={nombre} onChange={e => setNombre(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" /> Rol
          </Label>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="agricultor">Agricultor / exportador</SelectItem>
              <SelectItem value="apicultor">Apicultor</SelectItem>
              <SelectItem value="tecnico">Asistente técnico</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Rol actual: <Badge variant="secondary">{ROL_LABELS[tipo] ?? tipo}</Badge>
          </p>
        </div>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar cambios
        </Button>
      </form>
    </Card>
  );
}

function EliminarCuentaCard() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const eliminar = async () => {
    if (confirm !== "ELIMINAR") return;
    setDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No hay sesión activa");

      // Eliminar datos del usuario en cascada
      await Promise.all([
        supabase.from("alertas").delete().eq("destinatario_id", user.id),
        supabase.from("apiarios").delete().eq("user_id", user.id),
        supabase.from("fincas").delete().eq("user_id", user.id),
        supabase.from("profiles").delete().eq("id", user.id),
      ]);

      await authStore.signOut();
      toast.success("Cuenta eliminada");
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar la cuenta");
      setDeleting(false);
    }
  };

  return (
    <Card className="border-destructive/30 p-6">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-destructive">
        Zona de peligro
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Eliminar tu cuenta borra permanentemente tus fincas, apiarios y alertas. Esta acción no se puede deshacer.
      </p>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
        <Trash2 className="mr-1.5 h-4 w-4" /> Eliminar cuenta
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar tu cuenta?</DialogTitle>
            <DialogDescription>
              Se borrarán todas tus fincas, apiarios y alertas. Escribe <strong>ELIMINAR</strong> para confirmar.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="ELIMINAR"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); setConfirm(""); }}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={confirm !== "ELIMINAR" || deleting}
              onClick={() => void eliminar()}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar eliminación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
