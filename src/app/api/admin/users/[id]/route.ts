import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { isSuperAdmin, isAdminRoleId } from "@/lib/adminRoles";
import { updateAdminUserRole } from "@/lib/server/adminUsersRepo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (!isSuperAdmin(session.role)) {
    return NextResponse.json({ error: "Only a super admin can change roles." }, { status: 403 });
  }

  const { id } = await params;

  // Changing your own role could strand every super admin outside /admin/users
  // with nobody left able to undo it — have another super admin do it instead.
  if (id === session.adminId) {
    return NextResponse.json({ error: "Ask another super admin to change your role." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const role = (body as Record<string, unknown> | null)?.role;
  if (!isAdminRoleId(role)) {
    return NextResponse.json({ error: "Unknown role." }, { status: 400 });
  }

  try {
    const user = await updateAdminUserRole(id, role);
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    return NextResponse.json({ user });
  } catch (error) {
    console.error("[admin/users PATCH]", error);
    return NextResponse.json({ error: "Could not update the role." }, { status: 500 });
  }
}
