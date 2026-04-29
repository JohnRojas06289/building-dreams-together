/**
 * Store local — reemplaza Supabase DB para el demo.
 * Datos persistidos en localStorage. Cero dependencias externas.
 */

function load<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) ?? "[]"); }
  catch { return []; }
}

function save<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

const now = () => new Date().toISOString();

// ─── Fincas ──────────────────────────────────────────────────────────────────

export interface FincaRow {
  id: string;
  user_id: string;
  nombre: string;
  cultivo: string;
  latitud: number;
  longitud: number;
  organica: boolean;
  area_hectareas?: number;
  certificaciones: string[];
  created_at: string;
}

export function getFincas(userId: string): FincaRow[] {
  return load<FincaRow>("agrosync_fincas")
    .filter(f => f.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function createFinca(data: Omit<FincaRow, "id" | "created_at">): FincaRow {
  const row: FincaRow = { ...data, id: crypto.randomUUID(), created_at: now() };
  save("agrosync_fincas", [...load("agrosync_fincas"), row]);
  return row;
}

// ─── Apiarios ─────────────────────────────────────────────────────────────────

export interface ApiarioRow {
  id: string;
  user_id: string;
  nombre: string;
  latitud: number;
  longitud: number;
  num_colmenas: number;
  radio_proteccion_m: number;
  contacto_telefono?: string;
  created_at: string;
}

export function getApiarios(): ApiarioRow[] {
  return load<ApiarioRow>("agrosync_apiarios");
}

export function createApiario(data: Omit<ApiarioRow, "id" | "created_at">): ApiarioRow {
  const row: ApiarioRow = { ...data, id: crypto.randomUUID(), created_at: now() };
  save("agrosync_apiarios", [...load("agrosync_apiarios"), row]);
  return row;
}

export function deleteApiario(id: string) {
  save("agrosync_apiarios", load<ApiarioRow>("agrosync_apiarios").filter(a => a.id !== id));
}

// ─── Alertas ─────────────────────────────────────────────────────────────────

export interface AlertaRow {
  id: string;
  destinatario_id: string;
  tipo: string;
  severidad: string;
  mensaje: string;
  leida: boolean;
  created_at: string;
}

export function getAlertas(userId: string): AlertaRow[] {
  return load<AlertaRow>("agrosync_alertas")
    .filter(a => a.destinatario_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function createAlertas(rows: Omit<AlertaRow, "id" | "leida" | "created_at">[]) {
  const list = load<AlertaRow>("agrosync_alertas");
  rows.forEach(r => list.push({ ...r, id: crypto.randomUUID(), leida: false, created_at: now() }));
  save("agrosync_alertas", list);
}
