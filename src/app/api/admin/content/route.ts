import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { guardPage } from "@/lib/server/access";
import { getLandingContent, saveLandingContent } from "@/lib/server/contentRepo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await guardPage("landing");
  if (denied) return denied;

  try {
    return NextResponse.json({ content: await getLandingContent() });
  } catch (error) {
    console.error("[admin/content] GET", error);
    return NextResponse.json({ error: "Could not load the page content." }, { status: 500 });
  }
}

/**
 * Replaces the whole document. There is no per-field endpoint on purpose: the
 * editor holds the entire document and saves it in one go, so a partial write
 * has no way to leave two fields disagreeing.
 *
 * Nothing is rejected for being blank — clearing a line of copy is a real
 * editorial choice. `saveLandingContent` normalises first, so an over-long or
 * wrong-typed field is clamped rather than stored.
 */
export async function PUT(request: Request) {
  const denied = await guardPage("landing");
  if (denied) return denied;

  let body: unknown;
  try {
    body = (await request.json())?.content;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const content = await saveLandingContent(body);
    revalidatePath("/");
    return NextResponse.json({ content });
  } catch (error) {
    console.error("[admin/content] PUT", error);
    return NextResponse.json({ error: "Could not save the page content." }, { status: 500 });
  }
}
