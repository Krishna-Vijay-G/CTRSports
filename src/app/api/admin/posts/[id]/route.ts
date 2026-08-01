import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { deletePost, getPost, updatePost } from "@/lib/posts";
import { deleteObject } from "@/lib/s3";
import { validatePostBody } from "@/lib/validatePost";

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

    // The image was swapped out — drop the orphaned object from S3.
    if (existing.image_key && existing.image_key !== parsed.value.image_key) {
      try {
        await deleteObject(existing.image_key);
      } catch (error) {
        console.error("[admin/posts PUT] orphaned S3 object", existing.image_key, error);
      }
    }

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
    const removed = await deletePost(id);
    if (!removed) {
      return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }

    if (removed.image_key) {
      try {
        await deleteObject(removed.image_key);
      } catch (error) {
        console.error("[admin/posts DELETE] orphaned S3 object", removed.image_key, error);
      }
    }

    revalidatePath("/");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/posts DELETE]", error);
    return NextResponse.json({ error: "Could not delete the post." }, { status: 500 });
  }
}
