# AgroSync

![Hero AgroSync](./src/assets/hero-andes.jpg)

**AgroSync convierte el viento en una decisión operativa auditable.**  
La plataforma ayuda a agricultores, apicultores y asistentes técnicos a **predecir deriva de agroquímicos**, **proteger apiarios cercanos** y **acelerar el cumplimiento fitosanitario** en Colombia.

---

## La experiencia del producto

AgroSync no empieza en la tecnología: empieza en una pregunta crítica para el campo:

> **¿Puedo aplicar hoy sin poner en riesgo mis colmenas, mi cosecha o mi exportación?**

La experiencia está diseñada para responder eso en minutos:

1. **Ingresas como agricultor, apicultor o técnico**
2. **Registras una finca o un apiario en el mapa**
3. **Simulas condiciones reales de aplicación** con clima, pendiente y tipo de fumigación
4. **Visualizas el riesgo de deriva** y los apiarios potencialmente afectados
5. **Recibes una ventana óptima de aplicación** con trazabilidad
6. **Generas soporte documental** y consultas al agente regulatorio cuando necesitas contexto normativo

---

## Qué se siente usar AgroSync

### 1. Landing centrado en valor
La home comunica el problema de negocio y biodiversidad: deriva invisible, riesgo de cuarentena, rechazo de exportaciones y fricción documental.

### 2. Onboarding por rol
Cada usuario entra desde su realidad:
- **Agricultor / exportador**: quiere decidir cuándo aplicar y reducir exposición regulatoria
- **Apicultor**: quiere proteger sus colmenas y recibir alertas tempranas
- **Asistente técnico**: quiere evidencia, contexto y trazabilidad

### 3. Centro de operaciones
El dashboard concentra la experiencia principal:
- mapa de fincas y apiarios
- simulador de deriva
- lectura de clima
- KPIs de exposición
- trazabilidad de impacto

### 4. ColmenaSegura
El sistema incorpora un enfoque colaborativo entre actores del territorio:
- registro georreferenciado de apiarios
- radios de protección
- alertas preventivas
- visualización de vecindad de riesgo

### 5. Agente regulatorio
El producto incluye un asistente conversacional para resolver dudas sobre:
- requisitos fitosanitarios
- restricciones de aplicación
- exportación y documentación
- implicaciones regulatorias en Colombia

### 6. Perfil y gestión de cuenta
Cada usuario puede ajustar su rol, datos básicos y gestionar su cuenta dentro de la plataforma.

---

## Capacidades principales

- **Predicción de deriva** con variables de viento, humedad, temperatura, nubosidad y pendiente
- **Visualización geoespacial** de fincas, apiarios y pluma estimada
- **Alertas** para actores impactados por riesgo de aplicación
- **Asistente IA** para contexto regulatorio y operativo
- **Autenticación real con Supabase**
- **Exportación de certificados / soportes PDF**

---

## Para quién es

- Productores de aguacate Hass, café, flores, plátano y otros cultivos expuestos a exigencias de exportación
- Redes de apicultores que necesitan trazabilidad y protección territorial
- Equipos técnicos que necesitan respaldo operativo y normativo

---

## Stack del producto

- **Frontend:** React 19 + TanStack Start + TypeScript
- **UI:** Tailwind CSS + componentes Radix
- **Datos y auth:** Supabase
- **Mapas:** Leaflet + Google Maps
- **IA:** Gemini API
- **Clima:** integración con fuentes meteorológicas externas
- **Deploy estático:** Render / Vercel

---

## Ejecutarlo localmente

### 1) Instalar dependencias

Con npm:

```bash
npm install
```

O con bun:

```bash
bun install
```

### 2) Configurar variables de entorno

Crea un archivo `.env.local` con al menos:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
VITE_GEMINI_API_KEY=
VITE_GOOGLE_MAPS_API_KEY=
```

### 3) Ejecutar el proyecto

```bash
npm run dev
```

o

```bash
bun run dev
```

### 4) Build de producción

```bash
npm run build
```

---

## Usuarios demo

El repositorio incluye un script para sembrar usuarios de prueba en Supabase:

```bash
SUPABASE_SERVICE_ROLE_KEY=tu_clave node scripts/seed-users.mjs
```

Usuarios incluidos:

- `agricultor@agrosync.demo`
- `apicultor@agrosync.demo`
- `tecnico@agrosync.demo`
- `admin@agrosync.demo`

Contraseña demo:

```bash
AgroSync2026!
```

---

## Estructura clave

```text
src/routes/           Experiencias principales del producto
src/components/       UI reutilizable y mapas
src/lib/              Lógica de deriva, clima, PDF y persistencia
src/integrations/     Integración con Supabase
scripts/              Utilidades de soporte y seed
supabase/             Configuración y migraciones
```

---

## Estado actual

AgroSync está construido como un **MVP funcional orientado a experiencia de producto**:
- propuesta de valor clara desde la landing
- autenticación por roles
- simulación de deriva con mapa
- agente regulatorio
- base para trazabilidad, alertas y documentación

---

## Visión

Convertir AgroSync en el sistema operativo agroambiental que coordina:

- aplicación responsable
- protección de polinizadores
- cumplimiento documental
- confianza entre vecinos productivos
- preparación exportadora

---

## Licencia

Pendiente de definir.
