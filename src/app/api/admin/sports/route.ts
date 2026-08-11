import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import { createSport, listAllSports } from "@/lib/server/sportsRepo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The whole list, hidden cards included. */
export async function GET() {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  try {
    return NextResponse.json({ sports: await listAllSports() });
  } catch (error) {
    console.error("[admin/sports] GET", error);
    return NextResponse.json({ error: "Could not load the sports." }, { status: 500 });
  }
}

/** Adds one. A card with no title is not a card, so that is the only hard rule. */
export async function POST(request: Request) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

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
    const sport = await createSport(body);
    revalidatePath("/");
    return NextResponse.json({ sport });
  } catch (error) {
    console.error("[admin/sports] POST", error);
    return NextResponse.json({ error: "Could not save the sport." }, { status: 500 });
  }
}
