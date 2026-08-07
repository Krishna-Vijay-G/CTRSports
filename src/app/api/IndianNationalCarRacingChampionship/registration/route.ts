import { NextResponse } from "next/server";
import { ensureRegistrationsTable } from "@/lib/server/db";
import { createRegistration, getCategoryAgeLimits } from "@/lib/server/registrationsRepo";
import { validateRegistrationBody } from "@/lib/validateRegistration";
import { ageFromDob } from "@/lib/registrations";
import { RACE_CATEGORIES } from "@/lib/raceCategories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Honeypot: a field real visitors never see or fill in. A bot that fills
  // every field trips this — report success but skip the write.
  const honeypot = (body as Record<string, unknown> | null)?.company;
  if (typeof honeypot === "string" && honeypot.trim()) {
    return NextResponse.json({ ok: true });
  }

  const parsed = validateRegistrationBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    await ensureRegistrationsTable();

    // Check age eligibility against the category's configured limits.
    const limits = await getCategoryAgeLimits(parsed.value.category);
    if (limits.min_age !== null || limits.max_age !== null) {
      const age = ageFromDob(parsed.value.dob);
      const categoryName = RACE_CATEGORIES[parsed.value.category]?.name ?? parsed.value.category;
      if (age === null) {
        return NextResponse.json({ error: "Invalid date of birth." }, { status: 400 });
      }
      if (limits.min_age !== null && age < limits.min_age) {
        return NextResponse.json(
          { error: `You must be at least ${limits.min_age} years old to enter ${categoryName}.` },
          { status: 400 }
        );
      }
      if (limits.max_age !== null && age > limits.max_age) {
        return NextResponse.json(
          { error: `${categoryName} is open to drivers up to ${limits.max_age} years old. Your age (${age}) exceeds the limit.` },
          { status: 400 }
        );
      }
    }

    await createRegistration(parsed.value);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[INCRC/registration]", error);
    return NextResponse.json(
      { error: "Could not save your registration. Please try again." },
      { status: 500 }
    );
  }
}
