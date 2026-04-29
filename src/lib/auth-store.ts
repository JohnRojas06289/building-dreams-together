import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface AppUser {
  id: string;
  email: string;
  user_metadata: { nombre: string; tipo_usuario: string };
}

function normalizeTipoUsuario(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) return "agricultor";
  return value;
}

async function resolveProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("nombre, tipo_usuario")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function toAppUser(user: User): Promise<AppUser> {
  const profile = await resolveProfile(user.id).catch(() => null);
  const nombre =
    profile?.nombre ??
    (typeof user.user_metadata?.nombre === "string" && user.user_metadata.nombre.length > 0
      ? user.user_metadata.nombre
      : user.email?.split("@")[0] ?? "Usuario");
  const tipoUsuario = normalizeTipoUsuario(profile?.tipo_usuario ?? user.user_metadata?.tipo_usuario);

  return {
    id: user.id,
    email: user.email ?? "",
    user_metadata: {
      nombre,
      tipo_usuario: tipoUsuario,
    },
  };
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Ocurrió un error inesperado.";
}

async function sessionToAppUser(session: Session | null): Promise<AppUser | null> {
  const user = session?.user;
  return user ? toAppUser(user) : null;
}

export const authStore = {
  async getUser(): Promise<AppUser | null> {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new Error(error.message);
    return sessionToAppUser(data.session);
  },

  onChange(callback: () => void) {
    const { data } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent) => {
      callback();
    });

    return () => data.subscription.unsubscribe();
  },

  async signIn(email: string, password: string): Promise<{ user: AppUser | null; error: string | null }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { user: null, error: error.message };
      return { user: await sessionToAppUser(data.session), error: null };
    } catch (error) {
      return { user: null, error: toErrorMessage(error) };
    }
  },

  async signUp(
    email: string,
    password: string,
    nombre: string,
    tipo_usuario: string,
  ): Promise<{ user: AppUser | null; error: string | null }> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { nombre, tipo_usuario },
        },
      });

      if (error) return { user: null, error: error.message };
      return { user: await sessionToAppUser(data.session), error: null };
    } catch (error) {
      return { user: null, error: toErrorMessage(error) };
    }
  },

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  },
};
