import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import { deleteSport, updateSport } from "@/lib/server/sportsRepo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Context) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const title = (body as { title?: unknown })?.title;
  if (typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }

  try {
    const sport = await updateSport(id, body);
    if (!sport) {
      return NextResponse.json({ error: "That sport no longer exists." }, { status: 404 });
    }

    revalidatePath("/");
    return NextResponse.json({ sport });
  } catch (error) {
    console.error("[admin/sports/:id] PUT", error);
    return NextResponse.json({ error: "Could not save the sport." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;

  try {
    const deleted = await deleteSport(id);
    if (!deleted) {
      return NextResponse.json({ error: "That sport no longer exists." }, { status: 404 });
    }

    revalidatePath("/");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/sports/:id] DELETE", error);
    return NextResponse.json({ error: "Could not delete the sport." }, { status: 500 });
  }
}
