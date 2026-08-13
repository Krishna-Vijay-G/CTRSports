"use client";

import { MIN_PASSWORD, type AdminAccount } from "@/lib/admins";
import { ADMIN_ROLES, PAGE_KEYS, PAGE_LABELS, ROLE_HINTS, ROLE_LABELS } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { Button } from "@/admin/ui/Button";
import { Input, Label, Select } from "@/admin/ui/Input";
import { CheckIcon, TrashIcon } from "@/admin/ui/icons";
import { Field, Hint, Note, Panel } from "@/admin/components/Fields";

/**
 * One account's record.
 *
 * The page tick-boxes appear only for the `pages` role, because for the other
 * two they decide nothing: an owner has every screen and a registrations admin
 * has none, and showing a list of ticks that changes nothing is how an admin
 * ends up believing it did.
 *
 * The password field is blank on an account that already exists, and blank
 * means "leave it alone" rather than "clear it" — there is no such thing as an
 * account with no password. Typing one is the only way to change it, and doing
 * so signs that person out everywhere, which the note says out loud because it
 * is a surprising thing to happen to someone else while they are working.
 */
export function AdminForm({
  account,
  password,
  isNew,
  isSelf,
  onChange,
  onPassword,
  onDelete,
  busy,
}: {
  account: AdminAccount;
  /** Held by the editor, not on the record — it is never read back. */
  password: string;
  isNew: boolean;
  /** The account doing the editing. It cannot delete itself. */
  isSelf: boolean;
  onChange: (next: AdminAccount) => void;
  onPassword: (value: string) => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const set = (patch: Partial<AdminAccount>) => onChange({ ...account, ...patch });

  function togglePage(page: (typeof PAGE_KEYS)[number]) {
    const has = account.pages.includes(page);
    set({ pages: PAGE_KEYS.filter((key) => (key === page ? !has : account.pages.includes(key))) });
  }

  return (
    <>
      <Panel title="Account">
        <div className="space-y-3">
          <Field
            label="Username"
            value={account.username}
            onChange={(username) => set({ username })}
            maxLength={60}
            placeholder="kavin"
            hint="What they type to sign in. Lower case, no spaces."
          />

          <label className="block">
            <Label>Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(event) => onPassword(event.target.value)}
              autoComplete="new-password"
              placeholder={isNew ? `At least ${MIN_PASSWORD} characters` : "Leave blank to keep it"}
              className="mt-1.5"
            />
            <Hint className="mt-1">
              {isNew
                ? `At least ${MIN_PASSWORD} characters. There is no reset by email, so write it down somewhere safe.`
                : "Blank leaves the password as it is. Changing it signs this account out everywhere."}
            </Hint>
          </label>
        </div>
      </Panel>

      <Panel title="Access">
        <div className="space-y-3">
          <div className="block">
            <Label>Role</Label>
            <Select
              value={account.role}
              onChange={(event) =>
                set({ role: event.target.value as AdminAccount["role"] })
              }
              className="mt-1.5 w-full"
            >
              {ADMIN_ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </Select>
            <Hint className="mt-1">{ROLE_HINTS[account.role]}</Hint>
          </div>

          {account.role === "pages" ? (
            <div className="block">
              <Label>Pages</Label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {PAGE_KEYS.map((page) => {
                  const on = account.pages.includes(page);

                  return (
                    <Button
                      key={page}
                      variant={on ? "default" : "outline"}
                      size="sm"
                      onClick={() => togglePage(page)}
                      aria-pressed={on}
                    >
                      {on ? <CheckIcon /> : null}
                      {PAGE_LABELS[page]}
                    </Button>
                  );
                })}
              </div>
              <Hint className="mt-1">
                Only these screens open for them. They can point a button at a registration form
                for one of these pages, but not build or change one.
              </Hint>
            </div>
          ) : null}

          {account.role === "owner" ? (
            <Note>
              An owner can edit every page, build forms, read entries, and make or remove
              accounts — including this one.
            </Note>
          ) : null}
        </div>
      </Panel>

      <div className={cn("flex", isNew && "hidden")}>
        <Button
          variant="destructive"
          size="sm"
          onClick={onDelete}
          disabled={busy || isSelf}
          title={isSelf ? "You cannot delete the account you are signed in as." : undefined}
        >
          <TrashIcon />
          Delete account
        </Button>
      </div>
    </>
  );
}
