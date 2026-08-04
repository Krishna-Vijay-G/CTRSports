import type { RaceCategoryId } from "@/lib/raceCategories";

/** A driver's entry for a racing category. Shape only — see `lib/server/registrationsRepo` for the query. */
export type Registration = {
  id: string;
  name: string;
  /** ISO date, `YYYY-MM-DD` — age is derived from this rather than stored. */
  dob: string;
  category: RaceCategoryId;
  phone: string;
  email: string;
  /** ISO 8601 string — serialisable across the server/client boundary. */
  created_at: string;
};

export type RegistrationInput = Omit<Registration, "id" | "created_at">;

/**
 * Whole years old as of `now`, month/day aware. `null` for anything that
 * isn't a `YYYY-MM-DD` date — used both to validate a submission and to
 * display a registrant's current age in the admin list.
 */
export function ageFromDob(dob: string, now: Date = new Date()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const birth = new Date(`${dob}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;

  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
}
