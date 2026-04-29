/**
 * Auth local — reemplaza Supabase Auth para el demo.
 * Sesión persistida en localStorage. Cero dependencias externas.
 */

export interface AppUser {
  id: string;
  email: string;
  user_metadata: { nombre: string; tipo_usuario: string };
}

const SESSION_KEY = "agrosync_session";
const USERS_KEY = "agrosync_users";

// Cuentas de prueba predefinidas — no requieren signup
const DEV_ACCOUNTS = [
  { id: "dev-agricultor", email: "agricultor@agrosync.demo", password: "AgroSync2026!", nombre: "Carlos Mendoza", tipo_usuario: "agricultor" },
  { id: "dev-apicultor", email: "apicultor@agrosync.demo", password: "AgroSync2026!", nombre: "María Torres", tipo_usuario: "apicultor" },
  { id: "dev-tecnico",   email: "tecnico@agrosync.demo",   password: "AgroSync2026!", nombre: "Andrés Ríos",   tipo_usuario: "tecnico" },
  { id: "dev-admin",     email: "admin@agrosync.demo",     password: "AgroSync2026!", nombre: "Admin AgroSync", tipo_usuario: "admin" },
];

type Account = typeof DEV_ACCOUNTS[number];

function loadRegistered(): Account[] {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) ?? "[]"); }
  catch { return []; }
}

function allAccounts(): Account[] {
  return [...DEV_ACCOUNTS, ...loadRegistered()];
}

function toUser(a: Account): AppUser {
  return { id: a.id, email: a.email, user_metadata: { nombre: a.nombre, tipo_usuario: a.tipo_usuario } };
}

function emit() {
  window.dispatchEvent(new Event("agrosync_auth"));
}

export const authStore = {
  getUser(): AppUser | null {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null"); }
    catch { return null; }
  },

  signIn(email: string, password: string): { user: AppUser | null; error: string | null } {
    const acc = allAccounts().find(a => a.email === email && a.password === password);
    if (!acc) return { user: null, error: "Credenciales inválidas" };
    const user = toUser(acc);
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    emit();
    return { user, error: null };
  },

  signUp(
    email: string,
    password: string,
    nombre: string,
    tipo_usuario: string,
  ): { user: AppUser | null; error: string | null } {
    if (allAccounts().find(a => a.email === email)) {
      return { user: null, error: "Este correo ya está registrado" };
    }
    const acc: Account = {
      id: crypto.randomUUID(),
      email,
      password,
      nombre,
      tipo_usuario,
    };
    const registered = loadRegistered();
    localStorage.setItem(USERS_KEY, JSON.stringify([...registered, acc]));
    const user = toUser(acc);
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    emit();
    return { user, error: null };
  },

  signOut() {
    localStorage.removeItem(SESSION_KEY);
    emit();
  },
};
