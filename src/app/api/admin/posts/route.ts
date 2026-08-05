import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import { createPost, listAllPosts } from "@/lib/server/postsRepo";
import { canManageMedia } from "@/lib/adminRoles";
import { isSportId, sportPostsPath } from "@/lib/sports";
import { validatePostBody } from "@/lib/validatePost";

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
    return NextResponse.json({ error: "Your role does not manage this sport." }, { status: 403 });
  }

  try {
    return NextResponse.json({ posts: await listAllPosts(sport) });
  } catch (error) {
    console.error("[admin/posts GET]", error);
    return NextResponse.json({ error: "Could not load posts." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = validatePostBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  if (!canManageMedia(session.role, parsed.value.sport)) {
    return NextResponse.json({ error: "Your role does not manage this sport." }, { status: 403 });
  }

  try {
    const post = await createPost(parsed.value);
    revalidatePath(sportPostsPath(post.sport));
    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error("[admin/posts POST]", error);
    return NextResponse.json({ error: "Could not save the post." }, { status: 500 });
  }
}
