/**
 * Countries, their dialling codes, and how long a number is in each.
 *
 * A phone question used to be one box. That is fine for a form filled in by
 * people standing in the same country as the person who wrote it, and this one
 * is not: an entrant flying in for a round writes "+44 7911 123456", somebody in
 * Chennai writes "98765 43210", and a single box cannot tell you that the first
 * is complete and the second is missing nothing.
 *
 * So the country is picked and the number is typed, and what gets stored is the
 * two joined: "+91 9876543210". One string, still readable in an export, still
 * a phone number to anything that reads one.
 *
 * ── Why this is a file of its own ─────────────────────────────────────────
 *
 * Because both halves of the wire need it. The browser draws the picker from
 * this list, and `validateSubmission` checks what arrives against the same list
 * — a number the control would not have produced is not accepted just because it
 * was posted directly. Neither `forms.ts` nor a component owns it, so it sits
 * where both can import it, with no "server-only" on it.
 *
 * ── What a "length" means here ────────────────────────────────────────────
 *
 * Digits in the NATIONAL number: what is left after the dialling code, with
 * every space, bracket and hyphen taken out. A range rather than one number,
 * because plenty of countries have both nine- and ten-digit mobiles, and a
 * check that turns away a real number is worse than one that lets a wrong one
 * through — somebody with an unusual number cannot argue with a form.
 *
 * These are mobile lengths. A landline is often shorter, and this is asked for
 * on a registration form, where a mobile is what is wanted.
 */

export type Country = {
  /** ISO 3166-1 alpha-2. The stable key: names and codes both change. */
  code: string;
  name: string;
  /** The emoji. Drawn by the system font, so it costs nothing to ship. */
  flag: string;
  /** With its plus, as it is written and as it is stored. */
  dial: string;
  /** A real number's shape, shown in the box. */
  example: string;
  /** Digits in the national number, both ends counted. */
  min: number;
  max: number;
};

/**
 * The list, alphabetical by name.
 *
 * Alphabetical rather than "popular first" because a list ordered by somebody
 * else's idea of importance is one you have to read all of to be sure. The
 * DEFAULT is India — see `HOME` — which is the part that saves the scrolling.
 */
export const COUNTRIES: Country[] = [
  { code: "AR", name: "Argentina", flag: "🇦🇷", dial: "+54", example: "9 11 1234 5678", min: 10, max: 11 },
  { code: "AU", name: "Australia", flag: "🇦🇺", dial: "+61", example: "412 345 678", min: 9, max: 9 },
  { code: "AT", name: "Austria", flag: "🇦🇹", dial: "+43", example: "664 123456", min: 10, max: 11 },
  { code: "BD", name: "Bangladesh", flag: "🇧🇩", dial: "+880", example: "1712 345678", min: 10, max: 10 },
  { code: "BE", name: "Belgium", flag: "🇧🇪", dial: "+32", example: "470 12 34 56", min: 9, max: 9 },
  { code: "BR", name: "Brazil", flag: "🇧🇷", dial: "+55", example: "11 91234 5678", min: 10, max: 11 },
  { code: "CA", name: "Canada", flag: "🇨🇦", dial: "+1", example: "555 123 4567", min: 10, max: 10 },
  { code: "CL", name: "Chile", flag: "🇨🇱", dial: "+56", example: "9 8765 4321", min: 9, max: 9 },
  { code: "CN", name: "China", flag: "🇨🇳", dial: "+86", example: "138 0013 8000", min: 11, max: 11 },
  { code: "CO", name: "Colombia", flag: "🇨🇴", dial: "+57", example: "321 123 4567", min: 10, max: 10 },
  { code: "CZ", name: "Czech Republic", flag: "🇨🇿", dial: "+420", example: "601 123 456", min: 9, max: 9 },
  { code: "DK", name: "Denmark", flag: "🇩🇰", dial: "+45", example: "20 12 34 56", min: 8, max: 8 },
  { code: "EG", name: "Egypt", flag: "🇪🇬", dial: "+20", example: "10 1234 5678", min: 10, max: 10 },
  { code: "FI", name: "Finland", flag: "🇫🇮", dial: "+358", example: "50 123 4567", min: 9, max: 10 },
  { code: "FR", name: "France", flag: "🇫🇷", dial: "+33", example: "6 12 34 56 78", min: 9, max: 9 },
  { code: "DE", name: "Germany", flag: "🇩🇪", dial: "+49", example: "151 12345678", min: 10, max: 11 },
  { code: "GH", name: "Ghana", flag: "🇬🇭", dial: "+233", example: "23 123 4567", min: 9, max: 9 },
  { code: "GR", name: "Greece", flag: "🇬🇷", dial: "+30", example: "694 123 4567", min: 10, max: 10 },
  { code: "HU", name: "Hungary", flag: "🇭🇺", dial: "+36", example: "20 123 4567", min: 9, max: 9 },
  { code: "IN", name: "India", flag: "🇮🇳", dial: "+91", example: "98765 43210", min: 10, max: 10 },
  { code: "ID", name: "Indonesia", flag: "🇮🇩", dial: "+62", example: "812 3456 789", min: 9, max: 12 },
  { code: "IL", name: "Israel", flag: "🇮🇱", dial: "+972", example: "50 123 4567", min: 9, max: 9 },
  { code: "IT", name: "Italy", flag: "🇮🇹", dial: "+39", example: "312 345 6789", min: 9, max: 10 },
  { code: "JP", name: "Japan", flag: "🇯🇵", dial: "+81", example: "90 1234 5678", min: 10, max: 10 },
  { code: "KE", name: "Kenya", flag: "🇰🇪", dial: "+254", example: "712 123456", min: 9, max: 9 },
  { code: "MY", name: "Malaysia", flag: "🇲🇾", dial: "+60", example: "12 345 6789", min: 9, max: 10 },
  { code: "MX", name: "Mexico", flag: "🇲🇽", dial: "+52", example: "55 1234 5678", min: 10, max: 10 },
  { code: "NL", name: "Netherlands", flag: "🇳🇱", dial: "+31", example: "6 1234 5678", min: 9, max: 9 },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿", dial: "+64", example: "21 123 4567", min: 8, max: 10 },
  { code: "NG", name: "Nigeria", flag: "🇳🇬", dial: "+234", example: "802 123 4567", min: 10, max: 10 },
  { code: "NO", name: "Norway", flag: "🇳🇴", dial: "+47", example: "412 34 567", min: 8, max: 8 },
  { code: "PK", name: "Pakistan", flag: "🇵🇰", dial: "+92", example: "301 2345678", min: 10, max: 10 },
  { code: "PE", name: "Peru", flag: "🇵🇪", dial: "+51", example: "987 654 321", min: 9, max: 9 },
  { code: "PH", name: "Philippines", flag: "🇵🇭", dial: "+63", example: "917 123 4567", min: 10, max: 10 },
  { code: "PL", name: "Poland", flag: "🇵🇱", dial: "+48", example: "512 123 456", min: 9, max: 9 },
  { code: "PT", name: "Portugal", flag: "🇵🇹", dial: "+351", example: "912 345 678", min: 9, max: 9 },
  { code: "RU", name: "Russia", flag: "🇷🇺", dial: "+7", example: "912 123 4567", min: 10, max: 10 },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦", dial: "+966", example: "50 123 4567", min: 9, max: 9 },
  { code: "SG", name: "Singapore", flag: "🇸🇬", dial: "+65", example: "8123 4567", min: 8, max: 8 },
  { code: "ZA", name: "South Africa", flag: "🇿🇦", dial: "+27", example: "82 123 4567", min: 9, max: 9 },
  { code: "KR", name: "South Korea", flag: "🇰🇷", dial: "+82", example: "10 1234 5678", min: 9, max: 10 },
  { code: "ES", name: "Spain", flag: "🇪🇸", dial: "+34", example: "612 34 56 78", min: 9, max: 9 },
  { code: "LK", name: "Sri Lanka", flag: "🇱🇰", dial: "+94", example: "71 234 5678", min: 9, max: 9 },
  { code: "SE", name: "Sweden", flag: "🇸🇪", dial: "+46", example: "70 123 45 67", min: 9, max: 9 },
  { code: "CH", name: "Switzerland", flag: "🇨🇭", dial: "+41", example: "78 123 45 67", min: 9, max: 9 },
  { code: "TH", name: "Thailand", flag: "🇹🇭", dial: "+66", example: "81 234 5678", min: 9, max: 9 },
  { code: "TR", name: "Turkey", flag: "🇹🇷", dial: "+90", example: "532 123 45 67", min: 10, max: 10 },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪", dial: "+971", example: "50 123 4567", min: 9, max: 9 },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", dial: "+44", example: "7911 123456", min: 9, max: 10 },
  { code: "US", name: "United States", flag: "🇺🇸", dial: "+1", example: "555 123 4567", min: 10, max: 10 },
  { code: "UY", name: "Uruguay", flag: "🇺🇾", dial: "+598", example: "91 123 456", min: 8, max: 8 },
  { code: "VN", name: "Vietnam", flag: "🇻🇳", dial: "+84", example: "91 234 5678", min: 9, max: 9 },
];

/**
 * The one the box starts on.
 *
 * This is an Indian championship and its entrants are overwhelmingly Indian, so
 * the common case costs nobody a scroll. It is a starting point, not an
 * assumption: the picker is the first thing in the control.
 */
export const HOME = "IN";

export function countryFor(code: string): Country {
  return COUNTRIES.find((country) => country.code === code) ?? COUNTRIES.find((c) => c.code === HOME)!;
}

/** Just the digits. What people type between them is decoration. */
export function digitsOf(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * A stored number pulled apart into the country and the rest.
 *
 * Longest dialling code first, so "+1" does not claim a "+94" number. Two
 * countries share "+1"; the first alphabetically wins and the picker is right
 * there to change it — the number is identical either way, so nothing is lost.
 *
 * Anything with no code it recognises — a number typed before this control
 * existed, or one from a country not on the list — comes back on the home
 * country with the digits intact. It is never thrown away.
 */
export function splitNumber(value: string): { country: Country; national: string } {
  const trimmed = value.trim();

  if (trimmed.startsWith("+")) {
    const byLength = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
    const match = byLength.find((country) => trimmed.startsWith(country.dial));

    if (match) {
      return { country: match, national: digitsOf(trimmed.slice(match.dial.length)) };
    }
  }

  return { country: countryFor(HOME), national: digitsOf(trimmed) };
}

/** The two halves joined, as they are stored. Nothing typed means nothing. */
export function joinNumber(country: Country, national: string): string {
  const digits = digitsOf(national);
  return digits ? `${country.dial} ${digits}` : "";
}

/**
 * Whether a national number is the right length for its country. "" when it is.
 *
 * Used by the control as it is typed AND by `validateSubmission` on what
 * arrives, so a number that the picker would not have accepted cannot be posted
 * around it. The message names the country, because "that is too short" under a
 * box holding ten digits is only puzzling until you notice the flag says Kenya.
 */
export function checkNational(country: Country, national: string): string {
  const digits = digitsOf(national);
  if (digits === "") return "";

  if (digits.length < country.min || digits.length > country.max) {
    const wanted =
      country.min === country.max
        ? `${country.min} digits`
        : `${country.min} to ${country.max} digits`;

    // "A number in India", not "A India number": the name goes after the noun
    // so no entry in the list above needs an article picked for it.
    return `A number in ${country.name} is ${wanted} after ${country.dial} — that has ${digits.length}.`;
  }

  return "";
}

/**
 * The same check, on a stored number.
 *
 * "" for anything without a dialling code this knows: those are the numbers
 * this control never wrote, and turning away an answer somebody already gave —
 * or one from a country not on the list — because a picker was added later is
 * not a check, it is a form that stopped working.
 */
export function checkDialled(value: string): string {
  if (!value.trim().startsWith("+")) return "";

  const { country, national } = splitNumber(value);
  return checkNational(country, national);
}
