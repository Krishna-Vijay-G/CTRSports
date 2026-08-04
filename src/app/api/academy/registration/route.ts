import { NextResponse } from "next/server";
import { ensureRegistrationsTable } from "@/lib/server/db";
import { createRegistration } from "@/lib/server/registrationsRepo";
import { validateRegistrationBody } from "@/lib/validateRegistration";

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
    await createRegistration(parsed.value);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[academy/registration]", error);
    return NextResponse.json(
      { error: "Could not save your registration. Please try again." },
      { status: 500 }
    );
  }
}
