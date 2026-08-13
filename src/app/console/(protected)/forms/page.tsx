import { canManageForms, visibleFormPages } from "@/lib/roles";
import { requireForms } from "@/lib/server/access";
import { listForms } from "@/lib/server/formsRepo";
import { FormsEditor } from "@/admin/screens/forms/FormsEditor";

export const dynamic = "force-dynamic";

/**
 * The registration forms.
 *
 * Two audiences, one screen. A registrations admin or an owner builds forms
 * here; a page editor is let in to LOOK, because pointing a button at a form
 * means knowing which one to point at, and a list of names with no questions
 * under them is not enough to choose by.
 *
 * The narrowing happens here rather than in the editor: a page editor is handed
 * only the forms for their own pages, so one page's screen never lists another
 * page's entry form even for a moment.
 *
 * The throwing loader, like the circuits screen: an editor that quietly showed
 * an empty list after a failed read would invite someone to build the same form
 * a second time.
 */
export default async function FormsAdminPage() {
  const session = await requireForms();
  const forms = await listForms();

  const manage = canManageForms(session);
  const allowed = visibleFormPages(session);

  const mine = manage
    ? forms
    : forms.filter((form) => form.page_key !== "" && allowed.includes(form.page_key));

  return <FormsEditor initialForms={mine} canManage={manage} />;
}
