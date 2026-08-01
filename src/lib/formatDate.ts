/**
 * Formats a post timestamp. The timezone is pinned to Asia/Kolkata so the server
 * render and the client hydration produce identical text regardless of where
 * either one runs.
 */
const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Kolkata",
});

export function formatPostDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

export function formatPostDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}

/**
 * Converts an ISO timestamp into the `YYYY-MM-DDTHH:mm` shape that
 * `<input type="datetime-local">` expects, in Asia/Kolkata local time.
 */
export function toDateTimeLocal(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  }).formatToParts(new Date(iso));

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  // en-CA renders midnight as "24" in some runtimes; normalise it back to "00".
  const hour = get("hour") === "24" ? "00" : get("hour");

  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
}

/** Interprets a `datetime-local` value as Asia/Kolkata wall time and returns UTC ISO. */
export function fromDateTimeLocal(value: string): string {
  // IST is a fixed UTC+05:30 offset — no daylight saving to account for.
  return new Date(`${value}:00+05:30`).toISOString();
}
