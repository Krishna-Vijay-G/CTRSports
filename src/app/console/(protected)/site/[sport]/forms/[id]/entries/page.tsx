import { notFound } from "next/navigation";
import { isFormId } from "@/lib/forms";
import { requireSite } from "@/lib/server/access";
import { countEntries, listEntries } from "@/lib/server/entriesRepo";
import { getForm } from "@/lib/server/formsRepo";
import { EntriesTable } from "@/admin/screens/forms/EntriesTable";

export const dynamic = "force-dynamic";

/** The same page size the entries route hands out. */
const PAGE = 50;

type Params = { params: Promise<{ sport: string; id: string }> };

/**
 * Who has entered one form.
 *
 * Entries are people's names, addresses and phone numbers. What guards them is
 * the `forms` grant on this sport — the same grant that lets somebody build the
 * form — and then the check below that the form is actually one of this sport's.
 * Without that second half, holding `forms` on any sport would be enough to read
 * every sport's entries by putting the right id in the path.
 */
export default async function EntriesAdminPage({ params }: Params) {
  const { sport, id } = await params;
  const { site } = await requireSite(sport, "forms");

  if (!isFormId(id)) notFound();

  const form = await getForm(id);
  if (!form || form.site_id !== site.id) notFound();

  const [entries, total] = await Promise.all([listEntries(id, { limit: PAGE }), countEntries(id)]);

  const last = entries[entries.length - 1];

  return (
    <EntriesTable
      form={form}
      initialEntries={entries}
      // Both halves of the cursor, and only when there is a further page to
      // ask for. The repo hands back an ISO string now, so what crosses to the
      // browser is what the browser can send back.
      initialCursor={
        entries.length === PAGE && last ? { at: last.created_at, id: last.id } : null
      }
      total={total}
    />
  );
}
