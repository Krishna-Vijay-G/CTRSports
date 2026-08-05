import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import { canManageContent } from "@/lib/adminRoles";
import { getLandingContent, saveLandingContent } from "@/lib/server/siteContent";
import { normaliseLandingContent } from "@/lib/normaliseContent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (!canManageContent(session.role)) {
    return NextResponse.json({ error: "Your role does not manage site content." }, { status: 403 });
  }

  try {
    return NextResponse.json({ content: await getLandingContent() });
  } catch (error) {
    console.error("[admin/content GET]", error);
    return NextResponse.json({ error: "Could not load the page content." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (!canManageContent(session.role)) {
    return NextResponse.json({ error: "Your role does not manage site content." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // The normaliser IS the validation: unknown keys are dropped, unsafe URLs are
  // replaced with the default, and missing fields fall back rather than erroring.
  // There is no malformed input that should cost the editor their other changes.
  const content = normaliseLandingContent((body as { content?: unknown }).content ?? body);

  try {
    const saved = await saveLandingContent(content);
    revalidatePath("/");
    return NextResponse.json({ content: saved });
  } catch (error) {
    console.error("[admin/content PUT]", error);
    return NextResponse.json({ error: "Could not save the page content." }, { status: 500 });
  }
}
