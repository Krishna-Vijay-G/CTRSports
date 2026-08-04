"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Registration } from "@/lib/registrations";
import { ageFromDob } from "@/lib/registrations";
import { RACE_CATEGORY_LIST, RACE_CATEGORIES, type RaceCategoryId } from "@/lib/raceCategories";
import { formatPostDateTime } from "@/lib/formatDate";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { cn } from "@/lib/utils";

function matchesSearch(registration: Registration, query: string): boolean {
  if (!query) return true;
  const haystack = `${registration.name} ${registration.email} ${registration.phone}`.toLowerCase();
  return haystack.includes(query);
}

export function RegistrationsAdmin({
  registrations,
  username,
}: {
  registrations: Registration[];
  username: string;
}) {
  const router = useRouter();
  const [categoryFilter, setCategoryFilter] = useState<RaceCategoryId | "all">("all");
  const [search, setSearch] = useState("");

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return registrations.filter(
      (r) => (categoryFilter === "all" || r.category === categoryFilter) && matchesSearch(r, query)
    );
  }, [registrations, categoryFilter, search]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-6">
      <AdminHeader username={username} active="registrations" title="Race Registrations" />

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {([{ id: "all" as const, name: "All" }, ...RACE_CATEGORY_LIST]).map((category) => {
            const active = categoryFilter === category.id;
            const count =
              category.id === "all"
                ? registrations.length
                : registrations.filter((r) => r.category === category.id).length;

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setCategoryFilter(category.id)}
                aria-pressed={active}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition",
                  active
                    ? "border-racing-yellow/70 bg-racing-yellow/[0.08] text-racing-yellow"
                    : "border-white/10 text-white/50 hover:border-white/25 hover:text-white/75"
                )}
              >
                {category.name}
                <span className="ml-1.5 text-white/30">{count}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => router.refresh()}
          className="rounded-full border border-white/15 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/70 transition hover:border-racing-yellow/60 hover:text-racing-yellow"
        >
          Refresh
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email or phone…"
          className="w-full max-w-sm rounded-xl border border-white/10 bg-carbon-900 px-4 py-2.5 text-sm text-white outline-none transition focus:border-racing-yellow/60"
        />
        <span className="shrink-0 text-xs text-white/40">
          {visible.length} of {registrations.length}
        </span>
      </div>

      {visible.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-white/15 px-6 py-14 text-center text-sm text-white/40">
          {registrations.length === 0
            ? "No registrations yet."
            : "No registrations match this filter."}
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[860px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03] text-[11px] font-semibold uppercase tracking-wider text-white/45">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Age</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((registration) => {
                const age = ageFromDob(registration.dob);
                return (
                  <tr key={registration.id} className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-medium text-white">{registration.name}</td>
                    <td className="px-4 py-3 text-white/70">{age !== null ? age : "—"}</td>
                    <td className="px-4 py-3 text-white/70">
                      {RACE_CATEGORIES[registration.category]?.name ?? registration.category}
                    </td>
                    <td className="px-4 py-3 text-white/70">{registration.phone}</td>
                    <td className="px-4 py-3 text-white/70">{registration.email}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-white/50">
                      {formatPostDateTime(registration.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
