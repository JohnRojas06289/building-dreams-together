ALTER TABLE public.fincas
  ADD COLUMN IF NOT EXISTS poligono_geojson JSONB;
