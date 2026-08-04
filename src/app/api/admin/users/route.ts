import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { isSuperAdmin, isAdminRoleId } from "@/lib/adminRoles";
import { createAdminUser, listAdminUsers } from "@/lib/server/adminUsersRepo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_PASSWORD_LENGTH = 10;

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (!isSuperAdmin(session.role)) {
    return NextResponse.json({ error: "Only a super admin can manage users." }, { status: 403 });
  }

  try {
    return NextResponse.json({ users: await listAdminUsers() });
  } catch (error) {
    console.error("[admin/users GET]", error);
    return NextResponse.json({ error: "Could not load users." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (!isSuperAdmin(session.role)) {
    return NextResponse.json({ error: "Only a super admin can create users." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const raw = (body ?? {}) as Record<string, unknown>;
  const username = typeof raw.username === "string" ? raw.username.trim() : "";
  const password = typeof raw.password === "string" ? raw.password : "";
  const role = raw.role;

  if (!username) {
    return NextResponse.json({ error: "Username is required." }, { status: 400 });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` },
      { status: 400 }
    );
  }
  if (!isAdminRoleId(role)) {
    return NextResponse.json({ error: "Unknown role." }, { status: 400 });
  }

  try {
    const result = await createAdminUser(username, password, role);
    if (!result.ok) {
      return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
    }
    return NextResponse.json({ user: result.user }, { status: 201 });
  } catch (error) {
    console.error("[admin/users POST]", error);
    return NextResponse.json({ error: "Could not create the user." }, { status: 500 });
  }
}
