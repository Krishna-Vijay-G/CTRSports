/**
 * Applies the database schema.
 *
 *   npm run migrate
 */
import { neon } from "@neondatabase/serverless";
import { migrate } from "./schema.mjs";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Make sure .env exists in the project root.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

try {
  await migrate(sql);
  const cols = await sql`
    SELECT column_name FROM information_schema.columns
     WHERE table_name = 'media_posts' ORDER BY ordinal_position
  `;
  console.log("media_posts columns:", cols.map((c) => c.column_name).join(", "));
  console.log("Migration complete.");
} catch (error) {
  console.error("Migration failed:", error.message);
  process.exit(1);
}
