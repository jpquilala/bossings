/**
 * Grants an existing Supabase auth user a staff role.
 *
 *   node scripts/grant-admin.mjs someone@example.com          # ADMIN
 *   node scripts/grant-admin.mjs someone@example.com STAFF
 *
 * Create the user first (Supabase dashboard -> Authentication -> Add user),
 * so no password ever passes through this script or the shell history.
 *
 * The `on_auth_user_created` trigger inserts the profile row automatically at
 * signup with role CUSTOMER; this only promotes it. Uses the service-role key,
 * which bypasses RLS -- local/CI only, never bundled into the app.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

config({ path: ".env.local", quiet: true });

const email = process.argv[2];
// Only the two staff roles are grantable here. CUSTOMER is the signup default,
// and demoting is a different, riskier operation that should be deliberate.
const ROLES = ["ADMIN", "STAFF"];
const role = (process.argv[3] ?? "ADMIN").toUpperCase();

if (!email) {
  console.error("Usage: node scripts/grant-admin.mjs <email> [ADMIN|STAFF]");
  process.exit(1);
}
if (!ROLES.includes(role)) {
  console.error(`Unknown role "${role}". Expected one of: ${ROLES.join(", ")}`);
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supabase.auth.admin.listUsers();
if (error) {
  console.error("Could not list users:", error.message);
  process.exit(1);
}

const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
if (!user) {
  console.error(`No auth user found for ${email}.`);
  console.error("Create it first: Supabase dashboard -> Authentication -> Add user.");
  if (data.users.length) {
    console.error("\nExisting users:");
    for (const u of data.users) console.error(`  ${u.email}`);
  }
  process.exit(1);
}

if (!user.email_confirmed_at) {
  console.warn("Note: this email is not confirmed yet. Sign-in may be blocked until it is.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// The signup trigger normally creates this row; upsert covers the case where
// the user was created before the trigger existed.
const profile = await prisma.profile.upsert({
  where: { id: user.id },
  update: { role },
  create: {
    id: user.id,
    fullName: user.user_metadata?.full_name ?? null,
    role,
  },
  select: { id: true, fullName: true, role: true },
});

console.log(`${email} is now ${profile.role}`);
console.log(`  profile id: ${profile.id}`);
console.log(`  name:       ${profile.fullName ?? "(none)"}`);
console.log("\nSign in at /login -> \"Staff sign in\", then open /admin.");
console.log("Both ADMIN and STAFF reach /admin: isStaff() accepts either.");

await prisma.$disconnect();
