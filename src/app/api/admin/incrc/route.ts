import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import { getIncrcContent, saveIncrcContent } from "@/lib/server/contentRepo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

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
  if (!(await getSession())) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

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
