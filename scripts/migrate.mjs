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
  backfillRegisterCta,
  backfillRoundDates,
  backfillSportPhotos,
  backfillTrackDetails,
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
  console.log(
    "Schema applied: ctr_admins, ctr_sessions, ctr_sports, ctr_tracks, ctr_content, ctr_forms, ctr_form_entries, ctr_form_nonces."
  );
  console.log("Existing admin accounts keep full access: role defaults to 'owner' on this run.");

  const seeded = await seedSports(sql);
  console.log(seeded ? `Seeded ${seeded} sports.` : "ctr_sports already has rows — nothing seeded.");

  const circuits = await seedTracks(sql);
  console.log(
    circuits ? `Seeded ${circuits} circuits.` : "ctr_tracks already has rows — nothing seeded."
  );

  const filled = await backfillSportPhotos(sql);
  console.log(filled ? `Back-filled photos on ${filled} sport(s).` : "No sports needed a photo.");

  const details = await backfillTrackDetails(sql);
  console.log(
    details
      ? `Back-filled the record on ${details} circuit(s).`
      : "No circuits needed back-filling."
  );

  const dated = await backfillRoundDates(sql);
  console.log(
    dated ? `Back-filled dates or circuits on ${dated} round(s).` : "No rounds needed back-filling."
  );

  const cta = await backfillRegisterCta(sql);
  console.log(
    cta
      ? "Pointed the registration button back at this site — entry forms live here now."
      : "The registration button already points at this site."
  );
} catch (error) {
  console.error("Failed:", error.message);
  process.exit(1);
}
