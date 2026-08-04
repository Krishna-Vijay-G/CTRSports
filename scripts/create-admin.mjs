/**
 * Creates (or updates the password of) a media-admin account.
 *
 *   npm run create-admin -- <username> <password>
 *
 * Reads DATABASE_URL from .env via node --env-file. Also applies the schema, so
 * this doubles as the one-time database setup step.
 */
import { randomBytes, scrypt as scryptCb } from "node:crypto";
import { promisify } from "node:util";
import { neon } from "@neondatabase/serverless";
import { migrate } from "./schema.mjs";

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

async function hashPassword(plain) {
  const salt = randomBytes(16);
  const key = await scrypt(plain, salt, 64);
  return `scrypt:${salt.toString("hex")}:${key.toString("hex")}`;
}

async function main() {
  await migrate(sql);

  const hash = await hashPassword(password);

  const rows = await sql`
    INSERT INTO admin_users (username, password_hash)
    VALUES (${username}, ${hash})
    ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash
    RETURNING id, (xmax = 0) AS inserted
  `;

  // Any existing sessions for this account are no longer trustworthy after a
  // password change.
  await sql`DELETE FROM admin_sessions WHERE admin_id = ${rows[0].id}`;

  console.log(
    rows[0].inserted
      ? `Created admin "${username}".`
      : `Updated password for admin "${username}" and signed out existing sessions.`
  );
  console.log("Sign in at /media/admin/login");
}

main().catch((error) => {
  console.error("Failed:", error.message);
  process.exit(1);
});
