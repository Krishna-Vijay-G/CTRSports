/**
 * Creates (or updates the password and role of) an admin account.
 *
 *   npm run create-admin -- <username> <password> [role]
 *
 * `role` is one of the AdminRoleId values in src/lib/adminRoles.ts — defaults
 * to super_admin so the very first account this is run for can set up
 * everyone else through /admin/users.
 *
 * Reads DATABASE_URL from .env via node --env-file. Also applies the schema, so
 * this doubles as the one-time database setup step.
 */
import { randomBytes, scrypt as scryptCb } from "node:crypto";
import { promisify } from "node:util";
import { neon } from "@neondatabase/serverless";
import { migrate } from "./schema.mjs";

const scrypt = promisify(scryptCb);

const ADMIN_ROLE_IDS = [
  "super_admin",
  "main_admin",
  "academy_admin",
  "volleyball_admin",
  "cricket_admin",
  "karting_admin",
];

const [username, password, role = "super_admin"] = process.argv.slice(2);

if (!username || !password) {
  console.error("Usage: npm run create-admin -- <username> <password> [role]");
  process.exit(1);
}

if (password.length < 10) {
  console.error("Password must be at least 10 characters.");
  process.exit(1);
}

if (!ADMIN_ROLE_IDS.includes(role)) {
  console.error(`Unknown role "${role}". Expected one of: ${ADMIN_ROLE_IDS.join(", ")}`);
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Make sure .env exists in the project root.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function hashPassword(plain) {
  const salt = randomBytes(16);
  const key = await scrypt(plain, salt, 64);
  return `scrypt:${salt.toString("hex")}:${key.toString("hex")}`;
}

async function main() {
  await migrate(sql);

  const hash = await hashPassword(password);

  const rows = await sql`
    INSERT INTO admin_users (username, password_hash, role)
    VALUES (${username}, ${hash}, ${role})
    ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role
    RETURNING id, (xmax = 0) AS inserted
  `;

  // Any existing sessions for this account are no longer trustworthy after a
  // password or role change.
  await sql`DELETE FROM admin_sessions WHERE admin_id = ${rows[0].id}`;

  console.log(
    rows[0].inserted
      ? `Created admin "${username}" with role "${role}".`
      : `Updated admin "${username}" (role "${role}") and signed out existing sessions.`
  );
  console.log("Sign in at /admin/login");
}

main().catch((error) => {
  console.error("Failed:", error.message);
  process.exit(1);
});
