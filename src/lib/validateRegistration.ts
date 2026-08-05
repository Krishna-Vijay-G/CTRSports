import { ageFromDob, type RegistrationInput } from "@/lib/registrations";
import { isRaceCategoryId } from "@/lib/raceCategories";

export type ValidationResult =
  | { ok: true; value: RegistrationInput }
  | { ok: false; error: string };

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-()\s]{7,20}$/;

export function validateRegistrationBody(body: unknown): ValidationResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body." };
  }

  const raw = body as Record<string, unknown>;

  const name = asString(raw.name);
  if (!name) return { ok: false, error: "Name is required." };
  if (name.length > 120) return { ok: false, error: "Name must be 120 characters or fewer." };

  const dobRaw = asString(raw.dob);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dobRaw)) {
    return { ok: false, error: "Date of birth is not a valid date." };
  }
  const age = ageFromDob(dobRaw);
  if (age === null || age < 3 || new Date(`${dobRaw}T00:00:00`).getTime() > Date.now()) {
    return { ok: false, error: "Date of birth must be a real, past date." };
  }
  if (age > 100) {
    return { ok: false, error: "Date of birth looks incorrect — please check the year." };
  }

  const category = raw.category;
  if (!isRaceCategoryId(category)) {
    return { ok: false, error: "Choose a racing category." };
  }

  const phone = asString(raw.phone);
  if (!PHONE_RE.test(phone) || phone.replace(/\D/g, "").length < 7) {
    return { ok: false, error: "Enter a valid phone number." };
  }

  const email = asString(raw.email).toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  return {
    ok: true,
    value: { name, dob: dobRaw, category, phone, email },
  };
}
