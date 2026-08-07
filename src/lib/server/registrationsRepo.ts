import "server-only";

import { getSql } from "@/lib/server/db";
import type { Registration, RegistrationInput } from "@/lib/registrations";

type RegistrationRow = Omit<Registration, "created_at"> & { created_at: string | Date };

function toRegistration(row: RegistrationRow): Registration {
  return {
    ...row,
    created_at: new Date(row.created_at).toISOString(),
  };
}

// dob is cast to text in both queries below rather than left as a `date`
// column: the driver would otherwise deserialise it into a JS Date using the
// runtime's local timezone, which silently shifts the calendar day off by
// one when the process runs anywhere but UTC (verified against this app's
// IST dev host).
const COLUMNS = "id, name, dob::text AS dob, gender, participant_type, category, phone, email, created_at";

export async function createRegistration(input: RegistrationInput): Promise<Registration> {
  const sql = getSql();
  const rows = (await sql`
    INSERT INTO race_registrations (name, dob, gender, participant_type, category, phone, email)
    VALUES (${input.name}, ${input.dob}, ${input.gender}, ${input.participant_type}, ${input.category}, ${input.phone}, ${input.email})
    RETURNING ${sql.unsafe(COLUMNS)}
  `) as RegistrationRow[];

  return toRegistration(rows[0]);
}

export type CategoryAgeLimits = { min_age: number | null; max_age: number | null };

/** Returns the age limits configured for a category, or nulls if none are set. */
export async function getCategoryAgeLimits(categoryId: string): Promise<CategoryAgeLimits> {
  const sql = getSql();
  const rows = (await sql`
    SELECT min_age, max_age FROM race_categories WHERE id = ${categoryId}
  `) as CategoryAgeLimits[];
  return rows[0] ?? { min_age: null, max_age: null };
}

/** Every registration, newest first. */
export async function listRegistrations(): Promise<Registration[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT ${sql.unsafe(COLUMNS)}
      FROM race_registrations
     ORDER BY created_at DESC
  `) as RegistrationRow[];

  return rows.map(toRegistration);
}
