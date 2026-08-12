/**
 * Creates the tables and, on a fresh database, seeds the starting sports.
 *
 *   npm run migrate
 *
 * Safe to re-run: every statement is IF NOT EXISTS and the seed only fires when
 * ctr_sports is empty.
 */
import { neon } from "@neondatabase/serverless";
import {
  backfillRoundDates,
  backfillSportPhotos,
  migrate,
  seedSports,
  seedTracks,
} from "./schema.mjs";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Make sure .env exists in the project root.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

try {
  await migrate(sql);
  console.log("Schema applied: ctr_admins, ctr_sessions, ctr_sports, ctr_tracks, ctr_content.");

  const seeded = await seedSports(sql);
  console.log(seeded ? `Seeded ${seeded} sports.` : "ctr_sports already has rows — nothing seeded.");

  const circuits = await seedTracks(sql);
  console.log(
    circuits ? `Seeded ${circuits} circuits.` : "ctr_tracks already has rows — nothing seeded."
  );

  const filled = await backfillSportPhotos(sql);
  console.log(filled ? `Back-filled photos on ${filled} sport(s).` : "No sports needed a photo.");

  const dated = await backfillRoundDates(sql);
  console.log(
    dated ? `Back-filled dates or circuits on ${dated} round(s).` : "No rounds needed back-filling."
  );
} catch (error) {
  console.error("Failed:", error.message);
  process.exit(1);
}
