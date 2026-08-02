import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { deletePost, getPost, updatePost, type MediaPost } from "@/lib/posts";
import { deleteObject } from "@/lib/s3";
import { validatePostBody } from "@/lib/validatePost";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/** Drops S3 objects the post no longer points at. Never fails the request. */
async function removeKeys(keys: (string | null)[]) {
  for (const key of keys) {
    if (!key) continue;
    try {
      await deleteObject(key);
    } catch (error) {
      console.error("[admin/posts] orphaned S3 object", key, error);
    }
  }
}

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

  const parsed = validatePostBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const existing = await getPost(id);
    if (!existing) {
      return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }

    const post = await updatePost(id, parsed.value);

    const orphaned: (string | null)[] = [];
    if (existing.media_key && existing.media_key !== parsed.value.media_key) {
      orphaned.push(existing.media_key);
    }
    if (existing.poster_key && existing.poster_key !== parsed.value.poster_key) {
      orphaned.push(existing.poster_key);
    }
    await removeKeys(orphaned);

    revalidatePath("/");
    return NextResponse.json({ post });
  } catch (error) {
    console.error("[admin/posts PUT]", error);
    return NextResponse.json({ error: "Could not update the post." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;

  try {
    const removed: MediaPost | null = await deletePost(id);
    if (!removed) {
      return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }

    await removeKeys([removed.media_key, removed.poster_key]);

    revalidatePath("/");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/posts DELETE]", error);
    return NextResponse.json({ error: "Could not delete the post." }, { status: 500 });
  }
}
