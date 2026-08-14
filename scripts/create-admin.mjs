/**
 * Creates an admin account, or resets the password of an existing one.
 *
 *   npm run create-admin -- <username> <password>
 *   npm run create-admin -- <username> <password> --role pages --pages incrc,circuits
 *   npm run create-admin -- <username> <password> --role registrations
 *
 * Three roles, described in src/lib/roles.ts: `owner` (everything, including
 * the accounts), `pages` (only the page editors named by --pages), and
 * `registrations` (only the entry forms). The default here is `owner`, unlike
 * the database's own default — this is the bootstrap tool, run by whoever owns
 * the server, and the first account it makes has to be able to make the rest.
 *
 * Resetting an existing account's password does NOT change its role or its
 * pages unless those flags are given. A routine "they forgot their password"
 * must not quietly promote a scoped account to owner.
 *
 * There is an Accounts screen in the admin that does all of this; this stays
 * for the first account, and for the day somebody locks themselves out.
 *
 * Expects the schema to be there: `npm run db:migrate` first. It used to apply
 * the whole of scripts/schema.mjs on the way past, which was convenient and is
 * exactly the habit versioned migrations exist to break — the bootstrap tool
 * should not be a second, quieter way of changing the shape of the database.
 */
import { randomBytes, scrypt as scryptCb } from "node:crypto";
import { promisify } from "node:util";
import { neon } from "@neondatabase/serverless";

const scrypt = promisify(scryptCb);

const ROLES = ["owner", "pages", "registrations"];
const PAGES = ["landing", "incrc", "circuits"];

const USAGE =
  "Usage: npm run create-admin -- <username> <password> [--role owner|pages|registrations] [--pages landing,incrc,circuits]";

/** Positional first, then flags. Anything unrecognised is an error, not a shrug. */
function parse(argv) {
  const positional = [];
  const flags = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }

    const name = arg.slice(2);
    if (name !== "role" && name !== "pages") {
      console.error(`Unknown option "${arg}".`);
      console.error(USAGE);
      process.exit(1);
    }

    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      console.error(`--${name} needs a value.`);
      process.exit(1);
    }

    flags[name] = value;
    i += 1;
  }

  return { positional, flags };
}

const { positional, flags } = parse(process.argv.slice(2));
const [username, password] = positional;

if (!username || !password) {
  console.error(USAGE);
  process.exit(1);
}

if (password.length < 10) {
  console.error("Password must be at least 10 characters.");
  process.exit(1);
}

const role = flags.role ?? "owner";
if (!ROLES.includes(role)) {
  console.error(`Unknown role "${role}". One of: ${ROLES.join(", ")}.`);
  process.exit(1);
}

const pages = (flags.pages ?? "")
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean);

for (const page of pages) {
  if (!PAGES.includes(page)) {
    console.error(`Unknown page "${page}". One of: ${PAGES.join(", ")}.`);
    process.exit(1);
  }
}

// A page editor scoped to nothing can sign in and reach no screen at all. That
// is never what was meant, so it is refused here rather than made and puzzled
// over later.
if (role === "pages" && pages.length === 0) {
  console.error("A pages admin needs --pages. Try --pages incrc");
  process.exit(1);
}

if (role !== "pages" && pages.length > 0) {
  console.error(`--pages only applies to --role pages. "${role}" has no page list.`);
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
  const hash = await hashPassword(password);
  const pagesJson = JSON.stringify(pages);

  // Whether the access is written on a conflict depends on whether it was
  // asked for. Without a flag this is a password reset and nothing else — see
  // the note at the top of the file.
  const setAccess = flags.role !== undefined || flags.pages !== undefined;

  const rows = setAccess
    ? await sql`
        INSERT INTO ctr.admins (username, password_hash, role, pages)
        VALUES (${username}, ${hash}, ${role}, ${pagesJson}::jsonb)
        ON CONFLICT (username) DO UPDATE
          SET password_hash = EXCLUDED.password_hash,
              role          = EXCLUDED.role,
              pages         = EXCLUDED.pages
        RETURNING id, role, (xmax = 0) AS inserted
      `
    : await sql`
        INSERT INTO ctr.admins (username, password_hash, role, pages)
        VALUES (${username}, ${hash}, ${role}, ${pagesJson}::jsonb)
        ON CONFLICT (username) DO UPDATE
          SET password_hash = EXCLUDED.password_hash
        RETURNING id, role, (xmax = 0) AS inserted
      `;

  // A password change invalidates whatever was signed in before it.
  await sql`DELETE FROM ctr.sessions WHERE admin_id = ${rows[0].id}`;

  const access =
    rows[0].role === "pages" ? `pages: ${pages.join(", ") || "none"}` : rows[0].role;

  console.log(
    rows[0].inserted
      ? `Created admin "${username}" (${access}).`
      : `Reset the password for "${username}" (${access}) and signed out its existing sessions.`
  );

  if (!rows[0].inserted && !setAccess) {
    console.log("Its role and pages were left as they were. Pass --role to change them.");
  }

  console.log("Sign in at /login on the admin host.");
} catch (error) {
  // The likeliest failure on a new database, and the one with an answer.
  if (error.message.includes("does not exist")) {
    console.error("There is no ctr.admins table yet. Run npm run db:migrate first.");
    process.exit(1);
  }

  console.error("Failed:", error.message);
  process.exit(1);
}
