
-- Roles enum and table
CREATE TYPE public.app_role AS ENUM ('admin', 'agricultor', 'apicultor', 'tecnico');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  telefono TEXT,
  tipo_usuario TEXT NOT NULL DEFAULT 'agricultor',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles viewable by owner" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Trigger to create profile + default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre, tipo_usuario)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'tipo_usuario', 'agricultor')
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'tipo_usuario')::app_role, 'agricultor'));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Fincas
CREATE TABLE public.fincas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  cultivo TEXT NOT NULL,
  latitud DOUBLE PRECISION NOT NULL,
  longitud DOUBLE PRECISION NOT NULL,
  area_hectareas NUMERIC,
  certificaciones TEXT[] DEFAULT '{}',
  organica BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fincas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages fincas" ON public.fincas FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Apiarios (ColmenaSegura) - publicly readable for drift risk calculation
CREATE TABLE public.apiarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  latitud DOUBLE PRECISION NOT NULL,
  longitud DOUBLE PRECISION NOT NULL,
  num_colmenas INTEGER NOT NULL DEFAULT 1,
  radio_proteccion_m INTEGER NOT NULL DEFAULT 3000,
  contacto_telefono TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.apiarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Apiarios publicly readable" ON public.apiarios FOR SELECT USING (true);
CREATE POLICY "Owner inserts apiarios" ON public.apiarios FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner updates apiarios" ON public.apiarios FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Owner deletes apiarios" ON public.apiarios FOR DELETE USING (auth.uid() = user_id);

-- Aplicaciones (fumigaciones)
CREATE TABLE public.aplicaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  finca_id UUID NOT NULL REFERENCES public.fincas(id) ON DELETE CASCADE,
  producto TEXT NOT NULL,
  dosis TEXT,
  fecha_planificada TIMESTAMPTZ NOT NULL,
  ventana_optima_inicio TIMESTAMPTZ,
  ventana_optima_fin TIMESTAMPTZ,
  riesgo_deriva TEXT NOT NULL DEFAULT 'pendiente',
  viento_kmh NUMERIC,
  temperatura_c NUMERIC,
  humedad_pct NUMERIC,
  estado TEXT NOT NULL DEFAULT 'planificada',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.aplicaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages aplicaciones" ON public.aplicaciones FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Alertas
CREATE TABLE public.alertas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destinatario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  aplicacion_id UUID REFERENCES public.aplicaciones(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  severidad TEXT NOT NULL DEFAULT 'media',
  mensaje TEXT NOT NULL,
  leida BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.alertas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Recipient views alertas" ON public.alertas FOR SELECT USING (auth.uid() = destinatario_id);
CREATE POLICY "Recipient updates alertas" ON public.alertas FOR UPDATE USING (auth.uid() = destinatario_id);
CREATE POLICY "System inserts alertas" ON public.alertas FOR INSERT WITH CHECK (true);

CREATE INDEX idx_apiarios_location ON public.apiarios(latitud, longitud);
CREATE INDEX idx_alertas_dest ON public.alertas(destinatario_id, leida);
