import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { guardPage } from "@/lib/server/access";
import { getIncrcContent, saveIncrcContent } from "@/lib/server/contentRepo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await guardPage("incrc");
  if (denied) return denied;

  try {
    return NextResponse.json({ content: await getIncrcContent() });
  } catch (error) {
    console.error("[admin/incrc] GET", error);
    return NextResponse.json({ error: "Could not load the page content." }, { status: 500 });
  }
}

/**
 * Replaces the whole document, exactly as /api/admin/content does for the
 * landing page. There is no per-section endpoint on purpose: the editor holds
 * the entire document — including the running order — and saves it in one go,
 * so a partial write has no way to leave a section switched on with nothing in
 * it.
 */
export async function PUT(request: Request) {
  const denied = await guardPage("incrc");
  if (denied) return denied;

  let body: unknown;
  try {
    body = (await request.json())?.content;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const content = await saveIncrcContent(body);
    revalidatePath("/incrc");
    return NextResponse.json({ content });
  } catch (error) {
    console.error("[admin/incrc] PUT", error);
    return NextResponse.json({ error: "Could not save the page content." }, { status: 500 });
  }
}
