/**
 * Creates an admin account, or resets the password of an existing one.
 *
 *   npm run create-admin -- <username> <password>
 *
 * There are no roles: anyone who can sign in can edit the sports list. Applies
 * the schema first, so this doubles as one-time database setup.
 */
import { randomBytes, scrypt as scryptCb } from "node:crypto";
import { promisify } from "node:util";
import { neon } from "@neondatabase/serverless";
import { migrate, seedSports } from "./schema.mjs";

const scrypt = promisify(scryptCb);

const [username, password] = process.argv.slice(2);

if (!username || !password) {
  console.error("Usage: npm run create-admin -- <username> <password>");
  process.exit(1);
}

if (password.length < 10) {
  console.error("Password must be at least 10 characters.");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Make sure .env exists in the project root.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

/** Same `scrypt:<saltHex>:<keyHex>` format src/lib/server/auth.ts verifies. */
async function hashPassword(plain) {
  const salt = randomBytes(16);
  const key = await scrypt(plain, salt, 64);
  return `scrypt:${salt.toString("hex")}:${key.toString("hex")}`;
}

try {
  await migrate(sql);
  await seedSports(sql);

  const hash = await hashPassword(password);

  const rows = await sql`
    INSERT INTO ctr_admins (username, password_hash)
    VALUES (${username}, ${hash})
    ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash
    RETURNING id, (xmax = 0) AS inserted
  `;

  // A password change invalidates whatever was signed in before it.
  await sql`DELETE FROM ctr_sessions WHERE admin_id = ${rows[0].id}`;

  console.log(
    rows[0].inserted
      ? `Created admin "${username}".`
      : `Reset the password for "${username}" and signed out its existing sessions.`
  );
  console.log("Sign in at /admin/login");
} catch (error) {
  console.error("Failed:", error.message);
  process.exit(1);
}
