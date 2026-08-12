import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { revalidateTrackPages } from "@/lib/server/revalidateTracks";
import { deleteTrack, updateTrack } from "@/lib/server/tracksRepo";
import { isTrackId } from "@/lib/tracks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  if (!isTrackId(id)) {
    return NextResponse.json({ error: "No such circuit." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = (body as { name?: unknown })?.name;
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "A name is required." }, { status: 400 });
  }

  try {
    const track = await updateTrack(id, body);
    if (!track) {
      return NextResponse.json({ error: "No such circuit." }, { status: 404 });
    }

    revalidateTrackPages();
    return NextResponse.json({ track });
  } catch (error) {
    console.error("[admin/tracks] PUT", error);
    return NextResponse.json({ error: "Could not save the circuit." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  if (!isTrackId(id)) {
    return NextResponse.json({ error: "No such circuit." }, { status: 404 });
  }

  try {
    const removed = await deleteTrack(id);
    if (!removed) {
      return NextResponse.json({ error: "No such circuit." }, { status: 404 });
    }

    revalidateTrackPages();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/tracks] DELETE", error);
    return NextResponse.json({ error: "Could not delete the circuit." }, { status: 500 });
  }
}
