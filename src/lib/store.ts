import { supabase } from "@/integrations/supabase/client";
import type { GeoJsonPolygon } from "@/lib/geo";

export interface FincaRow {
  id: string;
  user_id: string;
  nombre: string;
  cultivo: string;
  latitud: number;
  longitud: number;
  organica: boolean;
  area_hectareas?: number | null;
  poligono_geojson?: GeoJsonPolygon | null;
  certificaciones: string[];
  created_at: string;
}

export interface ApiarioRow {
  id: string;
  user_id: string;
  nombre: string;
  latitud: number;
  longitud: number;
  num_colmenas: number;
  radio_proteccion_m: number;
  contacto_telefono?: string | null;
  created_at: string;
}

export interface AlertaRow {
  id: string;
  destinatario_id: string;
  tipo: string;
  severidad: string;
  mensaje: string;
  leida: boolean;
  created_at: string;
}

function requireData<T>(data: T | null, message: string): T {
  if (data == null) throw new Error(message);
  return data;
}

export async function getFincas(userId: string): Promise<FincaRow[]> {
  const { data, error } = await supabase
    .from("fincas")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as FincaRow[];
}

export async function createFinca(data: Omit<FincaRow, "id" | "created_at">): Promise<FincaRow> {
  const { data: inserted, error } = await supabase
    .from("fincas")
    .insert({
      ...data,
      certificaciones: data.certificaciones ?? [],
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return requireData(inserted as FincaRow | null, "No se pudo crear la finca.");
}

export async function getApiarios(): Promise<ApiarioRow[]> {
  const { data, error } = await supabase
    .from("apiarios")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as ApiarioRow[];
}

export async function createApiario(data: Omit<ApiarioRow, "id" | "created_at">): Promise<ApiarioRow> {
  const { data: inserted, error } = await supabase
    .from("apiarios")
    .insert(data)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return requireData(inserted as ApiarioRow | null, "No se pudo crear el apiario.");
}

export async function deleteApiario(id: string): Promise<void> {
  const { error } = await supabase.from("apiarios").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function getAlertas(userId: string): Promise<AlertaRow[]> {
  const { data, error } = await supabase
    .from("alertas")
    .select("*")
    .eq("destinatario_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as AlertaRow[];
}

export async function createAlertas(
  rows: Omit<AlertaRow, "id" | "leida" | "created_at">[],
): Promise<void> {
  const { error } = await supabase.from("alertas").insert(rows);
  if (error) throw new Error(error.message);
}
