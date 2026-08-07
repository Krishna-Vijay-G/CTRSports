import type { RaceCategoryId } from "@/lib/raceCategories";

/**
 * Gender options on the form. `id` is what lands in the database, so these
 * strings must stay stable. (Unlike race categories, which the academy page
 * also reads, gender is only ever used by this feature — so it lives here with
 * the rest of the registration shape rather than in a file of its own.)
 */
export const GENDER_IDS = ["male", "female", "other"] as const;

export type Gender = (typeof GENDER_IDS)[number];

export const GENDERS: Record<Gender, { id: Gender; label: string }> = {
  male: { id: "male", label: "Male" },
  female: { id: "female", label: "Female" },
  other: { id: "other", label: "Other" },
};

export const GENDER_LIST = GENDER_IDS.map((id) => GENDERS[id]);

export function isGender(value: unknown): value is Gender {
  return typeof value === "string" && (GENDER_IDS as readonly string[]).includes(value);
}

export const PARTICIPANT_TYPE_IDS = ["individual", "organization"] as const;

export type ParticipantType = (typeof PARTICIPANT_TYPE_IDS)[number];

export const PARTICIPANT_TYPES: Record<ParticipantType, { id: ParticipantType; label: string }> = {
  individual: { id: "individual", label: "Individual" },
  organization: { id: "organization", label: "Organization" },
};

export const PARTICIPANT_TYPE_LIST = PARTICIPANT_TYPE_IDS.map((id) => PARTICIPANT_TYPES[id]);

export function isParticipantType(value: unknown): value is ParticipantType {
  return typeof value === "string" && (PARTICIPANT_TYPE_IDS as readonly string[]).includes(value);
}

export function participantTypeLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return isParticipantType(value) ? PARTICIPANT_TYPES[value].label : value;
}

/** Display label for a stored value, tolerating rows saved before this field existed. */
export function genderLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return isGender(value) ? GENDERS[value].label : value;
}

/** A driver's entry for a racing category. Shape only — see `lib/server/registrationsRepo` for the query. */
export type Registration = {
  id: string;
  name: string;
  /** ISO date, `YYYY-MM-DD` — age is derived from this rather than stored. */
  dob: string;
  /**
   * `null` only for entries submitted before this field was added — the column
   * is nullable so the migration could not invent a value for existing rows.
   * Every new submission is required to set it.
   */
  gender: Gender | null;
  /** `null` only for entries submitted before this field was added. */
  participant_type: ParticipantType | null;
  category: RaceCategoryId;
  phone: string;
  email: string;
  /** ISO 8601 string — serialisable across the server/client boundary. */
  created_at: string;
};

export type RegistrationInput = Omit<Registration, "id" | "created_at" | "gender" | "participant_type"> & {
  gender: Gender;
  participant_type: ParticipantType;
};

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
