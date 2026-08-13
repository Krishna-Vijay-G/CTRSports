"use client";

import {
  ALL_OPTIONS,
  ALWAYS,
  CONDITION_OPS,
  CONDITION_OP_LABELS,
  MAX_FIELD_OPTIONS,
  isChoice,
  opIsNumeric,
  opTakesValue,
  optionsForKey,
  type AnswerColumn,
  type Condition,
  type FormField,
  type OptionFilter,
} from "@/lib/forms";
import { cn } from "@/lib/utils";
import { Button } from "@/admin/ui/Button";
import { Input, Label, Select } from "@/admin/ui/Input";
import { Hint, Note } from "@/admin/components/Fields";

/**
 * The two ways a question can depend on an earlier answer.
 *
 * Both are built from the SAME list of earlier answers — `keysBefore` — so the
 * builder can only offer a rule the normaliser will keep. A rule pointing
 * forwards is dropped on save, and a control that quietly loses what was typed
 * into it is worse than one that never offered it.
 *
 * Everything here is a picker rather than a box to type into. These rules
 * compare against option text exactly, and a rule that reads "is Karting" while
 * the option says "Karting " is a question that never appears with nothing on
 * screen to explain why. Where the answer being compared against is a fixed set,
 * the only way to say it is to pick it.
 */

/* ─────────────────────────── When to ask at all ──────────────────────── */

export function ConditionEditor({
  value,
  onChange,
  keys,
  fields,
}: {
  value: Condition;
  onChange: (next: Condition) => void;
  /** The answers above this question. Empty for the first one. */
  keys: AnswerColumn[];
  fields: FormField[];
}) {
  if (keys.length === 0) {
    return (
      <div className="block">
        <Label>When to ask</Label>
        <Hint className="mt-1">
          Always — this is the first question, so there is no earlier answer to depend on.
        </Hint>
      </div>
    );
  }

  const target = keys.find((key) => key.key === value.key);
  const options = value.key ? optionsForKey(fields, value.key) : [];

  return (
    <div className="block space-y-2 rounded-md border border-border bg-background/60 p-3">
      <div>
        <Label>When to ask</Label>
        <Select
          value={value.key}
          onChange={(event) =>
            // Changing what is being looked at throws away what was being looked
            // for: "is Karting" carried onto a different question is a rule that
            // reads sensibly and can never be true.
            onChange(
              event.target.value ? { key: event.target.value, op: "is", values: [] } : { ...ALWAYS }
            )
          }
          className="mt-1.5 w-full"
        >
          <option value="">— always ask this —</option>
          {keys.map((key) => (
            <option key={key.key} value={key.key}>
              {key.label}
            </option>
          ))}
        </Select>
      </div>

      {value.key ? (
        <>
          <Select
            value={value.op}
            onChange={(event) =>
              onChange({ ...value, op: event.target.value as Condition["op"], values: [] })
            }
            className="w-full"
          >
            {CONDITION_OPS.map((op) => (
              <option key={op} value={op}>
                {CONDITION_OP_LABELS[op]}
              </option>
            ))}
          </Select>

          {opTakesValue(value.op) ? (
            options.length > 0 ? (
              value.op === "any" ? (
                <Chips
                  all={options}
                  picked={value.values}
                  onToggle={(option) =>
                    onChange({
                      ...value,
                      values: value.values.includes(option)
                        ? value.values.filter((entry) => entry !== option)
                        : [...value.values, option].slice(0, MAX_FIELD_OPTIONS),
                    })
                  }
                />
              ) : (
                <Select
                  value={value.values[0] ?? ""}
                  onChange={(event) => onChange({ ...value, values: [event.target.value] })}
                  className="w-full"
                >
                  <option value="">— pick an answer —</option>
                  {options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              )
            ) : (
              <Input
                type={opIsNumeric(value.op) ? "number" : "text"}
                value={value.values[0] ?? ""}
                onChange={(event) => onChange({ ...value, values: [event.target.value] })}
                placeholder={opIsNumeric(value.op) ? "18" : "The answer to match"}
                aria-label="The value to compare against"
              />
            )
          ) : null}

          <Hint>
            {target?.derived
              ? "Worked out from the date, at the moment they send the form."
              : "Hidden questions are not asked and not stored — and anything depending on THEM disappears too, so a branch is never half-asked."}
          </Hint>

          {opTakesValue(value.op) && value.values.length === 0 ? (
            <Note className="text-destructive">
              Nothing to compare against yet, so this question will never be asked.
            </Note>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/* ────────────────────── Which options to offer ───────────────────────── */

/**
 * The cascading pair: a question asked of everyone, whose options depend on an
 * earlier answer.
 *
 * Grouped the way somebody thinks about it — "for Karting, offer these" —
 * rather than one rule per option, because that is how the list is written in
 * the first place. An option in no group at all is offered whatever they said,
 * which is what carries the "Other" that belongs to every branch.
 */
export function OptionGroups({
  field,
  onChange,
  keys,
}: {
  field: FormField;
  onChange: (next: OptionFilter) => void;
  /** Only the earlier answers worth branching on: the choice questions. */
  keys: { key: string; label: string; options: string[] }[];
}) {
  if (!isChoice(field.type) || keys.length === 0) return null;

  const filter = field.optionsWhen;
  const parent = keys.find((key) => key.key === filter.key);
  const grouped = new Set(Object.values(filter.groups).flat());

  function toggle(answer: string, option: string) {
    const current = filter.groups[answer] ?? [];
    const next = current.includes(option)
      ? current.filter((entry) => entry !== option)
      : [...current, option];

    const groups = { ...filter.groups };
    if (next.length > 0) groups[answer] = next;
    else delete groups[answer];

    onChange({ ...filter, groups });
  }

  return (
    <div className="block space-y-2 rounded-md border border-border bg-background/60 p-3">
      <div>
        <Label>Which options to offer</Label>
        <Select
          value={filter.key}
          // The groups go with the question they were grouped under. Keeping
          // them would leave ticks against answers that no longer exist.
          onChange={(event) =>
            onChange(event.target.value ? { key: event.target.value, groups: {} } : { ...ALL_OPTIONS })
          }
          className="mt-1.5 w-full"
        >
          <option value="">— offer all of them —</option>
          {keys.map((key) => (
            <option key={key.key} value={key.key}>
              Depends on: {key.label}
            </option>
          ))}
        </Select>
      </div>

      {parent ? (
        field.options.length === 0 ? (
          <Note>Add some options above first — there is nothing to sort into groups yet.</Note>
        ) : parent.options.length === 0 ? (
          <Note className="text-destructive">
            {parent.label} has no options of its own, so there is nothing to depend on.
          </Note>
        ) : (
          <>
            {parent.options.map((answer) => (
              <div key={answer}>
                <p className="mb-1.5 mt-2 text-[11px] font-medium uppercase tracking-wide text-muted-fg">
                  If they answer “{answer}”
                </p>
                <Chips
                  all={field.options}
                  picked={filter.groups[answer] ?? []}
                  onToggle={(option) => toggle(answer, option)}
                />
              </div>
            ))}

            <Note>
              {field.options.filter((option) => !grouped.has(option)).length > 0
                ? `Unticked everywhere, so always offered: ${field.options
                    .filter((option) => !grouped.has(option))
                    .join(", ")}.`
                : "Every option belongs to a group, so this question offers nothing at all until they have answered the one above."}
            </Note>

            <Note>
              These groups are held by the exact words of the options. Rewording one — here or in
              the question above — clears its ticks, so re-check them after an edit. It is enforced
              on the server too: an option that was not on offer is not an answer.
            </Note>
          </>
        )
      ) : null}
    </div>
  );
}

/* ──────────────────────────────── Shared ─────────────────────────────── */

/** A fixed set of words, any number of them lit. */
function Chips({
  all,
  picked,
  onToggle,
}: {
  all: string[];
  picked: string[];
  onToggle: (option: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {all.map((option) => {
        const on = picked.includes(option);

        return (
          <Button
            key={option}
            variant={on ? "default" : "outline"}
            size="sm"
            onClick={() => onToggle(option)}
            aria-pressed={on}
            className={cn("h-7 px-2.5 text-xs font-normal", on && "font-medium")}
          >
            {option}
          </Button>
        );
      })}
    </div>
  );
}
