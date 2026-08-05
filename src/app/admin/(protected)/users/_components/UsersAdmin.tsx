"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ADMIN_ROLE_LIST, DEFAULT_ADMIN_ROLE, type AdminRoleId } from "@/lib/adminRoles";
import type { AdminUser } from "@/lib/server/adminUsersRepo";
import { formatPostDateTime } from "@/lib/formatDate";
import { cn } from "@/lib/utils";

const fieldClass =
  "mt-2 w-full rounded-xl border border-white/10 bg-carbon-900 px-4 py-2.5 text-sm text-white outline-none transition focus:border-racing-yellow/60";

const labelClass = "font-display text-[11px] font-bold uppercase tracking-[0.18em] text-white/40";

const EMPTY_FORM = { username: "", password: "", role: DEFAULT_ADMIN_ROLE as AdminRoleId };

/** Super-admin-only screen: create accounts and assign each one its role. */
export function UsersAdmin({
  initialUsers,
  currentUserId,
}: {
  initialUsers: AdminUser[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [roleBusyId, setRoleBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function refresh() {
    const response = await fetch("/api/admin/users", { cache: "no-store" });
    if (response.ok) {
      const data = await response.json();
      setUsers(data.users as AdminUser[]);
    }
    router.refresh();
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "Could not create the user.");
        return;
      }

      setNotice(`Created "${form.username}".`);
      setForm(EMPTY_FORM);
      await refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRoleChange(user: AdminUser, role: AdminRoleId) {
    setRoleBusyId(user.id);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "Could not update the role.");
        return;
      }

      setNotice(`Updated "${user.username}" to ${ADMIN_ROLE_LIST.find((r) => r.id === role)?.name ?? role}.`);
      await refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setRoleBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-lg font-bold uppercase tracking-wide text-white">Users</h1>
      <p className="mt-2 text-sm text-white/45">
        Every admin account and what it can reach. Changing a role signs that account out of any
        active session immediately.
      </p>

      {notice ? (
        <p className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03] text-[11px] font-semibold uppercase tracking-wider text-white/45">
              <th className="px-4 py-3">Username</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isSelf = user.id === currentUserId;
              return (
                <tr key={user.id} className="border-b border-white/5 last:border-b-0">
                  <td className="px-4 py-3 font-medium text-white">
                    {user.username}
                    {isSelf ? <span className="ml-2 text-[11px] text-white/35">(you)</span> : null}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={user.role}
                      disabled={isSelf || roleBusyId === user.id}
                      onChange={(e) => handleRoleChange(user, e.target.value as AdminRoleId)}
                      className={cn(
                        "rounded-lg border border-white/10 bg-carbon-900 px-3 py-1.5 text-xs text-white outline-none transition focus:border-racing-yellow/60 [color-scheme:dark]",
                        (isSelf || roleBusyId === user.id) && "cursor-not-allowed opacity-50"
                      )}
                    >
                      {ADMIN_ROLE_LIST.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-white/50">
                    {formatPostDateTime(user.created_at)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <form
        onSubmit={handleCreate}
        className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6"
      >
        <h2 className="font-display text-base font-bold uppercase tracking-wide text-white">
          Create a user
        </h2>

        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          <label className="block">
            <span className={labelClass}>Username</span>
            <input
              type="text"
              required
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              autoComplete="off"
              className={fieldClass}
            />
          </label>

          <label className="block">
            <span className={labelClass}>Password</span>
            <input
              type="password"
              required
              minLength={10}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              autoComplete="new-password"
              className={fieldClass}
            />
          </label>

          <label className="block">
            <span className={labelClass}>Role</span>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as AdminRoleId }))}
              className={cn(fieldClass, "[color-scheme:dark]")}
            >
              {ADMIN_ROLE_LIST.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="mt-6 rounded-full bg-racing-yellow px-7 py-3 font-display text-sm font-bold uppercase tracking-wider text-carbon-950 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_-10px_rgba(247,214,25,0.55)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Creating…" : "Create user"}
        </button>
      </form>
    </div>
  );
}
