import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import { canManageMedia } from "@/lib/adminRoles";
import { getMarquee, saveMarquee } from "@/lib/server/marqueeRepo";
import { isSportId, sportPostsPath } from "@/lib/sports";
import { validateMarqueeBody } from "@/lib/validateMarquee";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const sport = new URL(request.url).searchParams.get("sport");
  if (!isSportId(sport)) {
    return NextResponse.json({ error: "Unknown sport." }, { status: 400 });
  }
  if (!canManageMedia(session.role, sport)) {
    return NextResponse.json({ error: "Your role does not manage this page." }, { status: 403 });
  }

  try {
    return NextResponse.json({ items: await getMarquee(sport) });
  } catch (error) {
    console.error("[admin/marquee GET]", error);
    return NextResponse.json({ error: "Could not load the marquee." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const sport = new URL(request.url).searchParams.get("sport");
  if (!isSportId(sport)) {
    return NextResponse.json({ error: "Unknown sport." }, { status: 400 });
  }
  if (!canManageMedia(session.role, sport)) {
    return NextResponse.json({ error: "Your role does not manage this page." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = validateMarqueeBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const items = await saveMarquee(sport, parsed.value);
    revalidatePath(sportPostsPath(sport));
    return NextResponse.json({ items });
  } catch (error) {
    console.error("[admin/marquee PUT]", error);
    return NextResponse.json({ error: "Could not save the marquee." }, { status: 500 });
  }
}
