import { notFound } from "next/navigation";
import { isFormId } from "@/lib/forms";
import { canManageForms } from "@/lib/roles";
import { requireForms } from "@/lib/server/access";
import { countEntries, listEntries } from "@/lib/server/entriesRepo";
import { getForm } from "@/lib/server/formsRepo";
import { EntriesTable } from "@/admin/screens/forms/EntriesTable";

export const dynamic = "force-dynamic";

/** The same page size the entries route hands out. */
const PAGE = 50;

type Params = { params: Promise<{ id: string }> };

/**
 * Who has entered one form.
 *
 * `requireForms` lets a page editor as far as the forms screen, so this asks
 * the narrower question again: entries are people's names, addresses and phone
 * numbers, and reading them is the registrations admin's job, not the job of
 * whoever links to the form.
 */
export default async function EntriesAdminPage({ params }: Params) {
  const session = await requireForms();
  if (!canManageForms(session)) notFound();

  const { id } = await params;
  if (!isFormId(id)) notFound();

  const form = await getForm(id);
  if (!form) notFound();

  const [entries, total] = await Promise.all([listEntries(id, { limit: PAGE }), countEntries(id)]);

  return (
    <EntriesTable
      form={form}
      initialEntries={entries}
      initialCursor={entries.length === PAGE ? entries[entries.length - 1].created_at : null}
      total={total}
    />
  );
}
