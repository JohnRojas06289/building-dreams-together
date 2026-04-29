/**
 * AgroSync — Script de seed de usuarios de prueba
 *
 * Uso:
 *   SUPABASE_SERVICE_ROLE_KEY=<tu_key> node scripts/seed-users.mjs
 *
 * La SERVICE_ROLE_KEY está en: Supabase Dashboard → Project Settings → API → service_role
 * NUNCA expongas esta clave en el frontend.
 */

const SUPABASE_URL = "https://qkumvthduszstptjuiod.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error("ERROR: Falta SUPABASE_SERVICE_ROLE_KEY en las variables de entorno.");
  console.error("Cópiala de: Supabase Dashboard → Project Settings → API → service_role");
  process.exit(1);
}

const USUARIOS = [
  {
    email: "agricultor@agrosync.demo",
    password: "AgroSync2026!",
    nombre: "Carlos Mendoza",
    tipo_usuario: "agricultor",
    descripcion: "Gerente de finca exportadora de aguacate Hass",
  },
  {
    email: "apicultor@agrosync.demo",
    password: "AgroSync2026!",
    nombre: "María Torres",
    tipo_usuario: "apicultor",
    descripcion: "Apicultora con 40 colmenas en zona andina",
  },
  {
    email: "tecnico@agrosync.demo",
    password: "AgroSync2026!",
    nombre: "Andrés Ríos",
    tipo_usuario: "tecnico",
    descripcion: "Asistente técnico ICA certificado",
  },
  {
    email: "admin@agrosync.demo",
    password: "AgroSync2026!",
    nombre: "Admin AgroSync",
    tipo_usuario: "admin",
    descripcion: "Administrador de la plataforma",
  },
];

async function adminPost(path, body) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

async function supabaseQuery(path, body, method = "POST") {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      Prefer: "return=minimal",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
}

async function createUser(u) {
  console.log(`\n→ Creando ${u.tipo_usuario}: ${u.email}`);

  // 1. Crear usuario vía Admin API (email_confirm: true = sin verificación)
  let userId;
  try {
    const user = await adminPost("/admin/users", {
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: {
        nombre: u.nombre,
        tipo_usuario: u.tipo_usuario,
      },
    });
    userId = user.id;
    console.log(`  ✓ Usuario creado — id: ${userId}`);
  } catch (err) {
    const msg = err.message;
    if (msg.includes("already been registered") || msg.includes("already exists")) {
      console.log(`  ⚠ Ya existía — buscando id...`);
      // Get existing user
      const res = await fetch(
        `${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=200`,
        {
          headers: {
            Authorization: `Bearer ${SERVICE_KEY}`,
            apikey: SERVICE_KEY,
          },
        }
      );
      const data = await res.json();
      const existing = data.users?.find((u2) => u2.email === u.email);
      if (!existing) throw new Error("No se pudo recuperar el usuario existente");
      userId = existing.id;
      console.log(`  ✓ Usuario existente — id: ${userId}`);
    } else {
      throw err;
    }
  }

  // 2. El trigger handle_new_user crea el perfil automáticamente.
  //    Si el usuario ya existía y el perfil falta, lo insertamos.
  try {
    await supabaseQuery("/profiles", {
      id: userId,
      nombre: u.nombre,
      tipo_usuario: u.tipo_usuario,
    });
    console.log(`  ✓ Perfil asegurado`);
  } catch {
    // Ya existe — ignorar
    console.log(`  ✓ Perfil ya existía`);
  }

  // 3. Asegurar rol en user_roles
  try {
    const role = u.tipo_usuario === "admin" ? "admin" : u.tipo_usuario;
    await supabaseQuery("/user_roles", {
      user_id: userId,
      role,
    });
    console.log(`  ✓ Rol '${role}' asignado`);
  } catch {
    console.log(`  ✓ Rol ya existía`);
  }

  return userId;
}

async function main() {
  console.log("=== AgroSync — Seed de usuarios de prueba ===");
  console.log(`URL: ${SUPABASE_URL}\n`);

  const results = [];
  for (const u of USUARIOS) {
    try {
      const id = await createUser(u);
      results.push({ ...u, id, status: "OK" });
    } catch (err) {
      console.error(`  ✗ Error: ${err.message}`);
      results.push({ ...u, status: "ERROR", error: err.message });
    }
  }

  console.log("\n=== CREDENCIALES DE PRUEBA ===\n");
  console.log(
    "┌──────────────────────────────────────┬─────────────────────────┬──────────────┐"
  );
  console.log(
    "│ Email                                │ Contraseña              │ Rol          │"
  );
  console.log(
    "├──────────────────────────────────────┼─────────────────────────┼──────────────┤"
  );
  for (const u of results) {
    const email = u.email.padEnd(36);
    const pass = u.password.padEnd(23);
    const role = u.tipo_usuario.padEnd(12);
    const icon = u.status === "OK" ? "✓" : "✗";
    console.log(`│ ${email} │ ${pass} │ ${role} │ ${icon}`);
  }
  console.log(
    "└──────────────────────────────────────┴─────────────────────────┴──────────────┘"
  );

  console.log("\n→ Ingresa en: http://localhost:5173/auth");
  console.log(
    "→ El dashboard y el Agente IA estarán disponibles para todos los roles."
  );
}

main().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
