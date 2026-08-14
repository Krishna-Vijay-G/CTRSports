"use client";

import {
  ALL_OPTIONS,
  ALWAYS,
  CONDITION_OPS,
  CONDITION_OP_LABELS,
  MAX_FIELD_OPTIONS,
  MAX_OPTION_BANDS,
  bandIsSet,
  bandLabel,
  isChoice,
  keyIsNumeric,
  opIsNumeric,
  opIsRange,
  opTakesValue,
  optionsForKey,
  type AnswerColumn,
  type Condition,
  type FormField,
  type OptionBand,
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

        {/*
          Dragging a conditional question to the top is how this happens, and
          saying nothing let two halves of the same screen disagree: the
          collapsed row still read "only sometimes" while this panel asserted
          the rule was gone — before the save that actually removed it.
        */}
        {value.key ? (
          <Note className="mt-2 text-destructive">
            It had a rule, and moving it to the top has broken it. Saving now will ask this of
            everybody — move it back below the question it depends on to keep the rule.
          </Note>
        ) : null}
      </div>
    );
  }

  const target = keys.find((key) => key.key === value.key);
  const options = value.key ? optionsForKey(fields, value.key) : [];
  const numeric = opIsNumeric(value.op);
  const range = opIsRange(value.op);

  // Values the rule still names that the parent has stopped offering. A numeric
  // comparison holds numbers, which are not meant to be on that list at all.
  const missing = numeric ? [] : value.values.filter((option) => !options.includes(option));

  /** Half of a range, written by position: [low, high]. */
  const setEnd = (at: 0 | 1, entry: string) => {
    const pair = [value.values[0] ?? "", value.values[1] ?? ""];
    pair[at] = entry;
    onChange({ ...value, values: pair });
  };

  const unset = range
    ? !value.values[0] || !value.values[1]
    : value.values.filter((entry) => entry !== "").length === 0;

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
            range ? (
              /* Two boxes, held by position, because a range is a pair and not
                 a list — see `condition` in forms.ts. Both ends count. */
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="number"
                  value={value.values[0] ?? ""}
                  onChange={(event) => setEnd(0, event.target.value)}
                  placeholder="12"
                  aria-label="The lowest number"
                  className="h-8 w-24 text-xs"
                />
                <span className="text-xs text-muted-fg">and</span>
                <Input
                  type="number"
                  value={value.values[1] ?? ""}
                  onChange={(event) => setEnd(1, event.target.value)}
                  placeholder="16"
                  aria-label="The highest number"
                  className="h-8 w-24 text-xs"
                />
                <span className="text-xs text-muted-fg">— both ends count</span>
              </div>
            ) : options.length > 0 && !numeric ? (
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
                type={numeric ? "number" : "text"}
                value={value.values[0] ?? ""}
                onChange={(event) => onChange({ ...value, values: [event.target.value] })}
                placeholder={numeric ? "18" : "The answer to match"}
                aria-label="The value to compare against"
              />
            )
          ) : null}

          <Hint>
            {target?.derived
              ? "Worked out from the date, at the moment they send the form."
              : "Hidden questions are not asked and not stored — and anything depending on THEM disappears too, so a branch is never half-asked."}
          </Hint>

          {opTakesValue(value.op) && unset ? (
            <Note className="text-destructive">
              {range
                ? "A range needs both ends, so this question will never be asked until it has them."
                : "Nothing to compare against yet, so this question will never be asked."}
            </Note>
          ) : null}

          {/*
            A number compared against something that does not answer with one.
            The comparison simply fails, every time, and the question quietly
            never appears — so it is said here rather than found later.
          */}
          {numeric && !keyIsNumeric(fields, value.key) ? (
            <Note className="text-destructive">
              “{target?.label || "The question above"}” does not answer with a number, so this
              comparison can never be true. Compare against a number question, or the age worked out
              from a date.
            </Note>
          ) : null}

          {range && value.values[0] && value.values[1] &&
          Number(value.values[0]) > Number(value.values[1]) ? (
            <Note className="text-destructive">
              The lowest number is above the highest, so nothing can fall between them.
            </Note>
          ) : null}

          {/*
            The rule names an answer the parent no longer offers.
            Renaming an option is the ordinary way to get here, and the dropdown
            above cannot show it — it has no matching entry, so it falls back to
            "pick an answer" and looks merely unset. The rule is still stored,
            still compares against the old text, and the question silently never
            appears.
          */}
          {opTakesValue(value.op) && !numeric && options.length > 0 && missing.length > 0 ? (
            <Note className="text-destructive">
              This compares against {missing.map((option) => `“${option}”`).join(", ")}, which
              “{target?.label || "the question above"}” no longer offers — so the question never
              appears. Pick an answer that exists, or set this back to “always ask this”.
            </Note>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/* ────────────────────── Which options to offer ───────────────────────── */

/** An earlier answer these options can be decided by. */
export type BranchKey = {
  key: string;
  label: string;
  /** The parent's own options. Empty for a numeric one. */
  options: string[];
  /** True for a number question or a derived age: decided by ranges, not words. */
  numeric: boolean;
};

/**
 * The cascading pair: a question asked of everyone, whose options depend on an
 * earlier answer.
 *
 * Two shapes, because there are two kinds of earlier answer and they are not
 * written down the same way:
 *
 *   a CHOICE parent   grouped the way somebody thinks about it — "for Karting,
 *                     offer these" — rather than one rule per option, because
 *                     that is how the list is written in the first place.
 *   a NUMBER parent   ranges — "18 and above, offer these" — because there is no
 *                     list of ages to tick against. An age worked out from a
 *                     date is the usual one, and a number question the other.
 *
 * In both, an option that is in no group and no range at all is offered whatever
 * they said, which is what carries the "Other" that belongs to every branch.
 */
export function OptionGroups({
  field,
  onChange,
  keys,
}: {
  field: FormField;
  onChange: (next: OptionFilter) => void;
  /** Only the earlier answers worth branching on. See `BranchKey`. */
  keys: BranchKey[];
}) {
  const filter = field.optionsWhen;
  const parent = keys.find((key) => key.key === filter.key);

  // Spoken for by a group or by a range — the rest are always offered. Ranges
  // with no numbers in them are ignored here exactly as `offeredOptions`
  // ignores them, so this line and the live form cannot disagree.
  const claimed = new Set([
    ...Object.values(filter.groups).flat(),
    ...filter.bands.filter(bandIsSet).flatMap((band) => band.options),
  ]);
  const always = field.options.filter((option) => !claimed.has(option));

  /*
   * A filter whose parent has disappeared from the picker.
   *
   * Changing the parent question's type away from a dropdown is how this
   * happens. The panel used to return `null` or quietly display "offer all of
   * them", while `offeredOptions` on the live site went on filtering against a
   * parent that could no longer answer — hiding every grouped option from every
   * visitor, permanently, with the admin insisting nothing was filtered.
   */
  if (!isChoice(field.type) || keys.length === 0) {
    return filter.key ? (
      <Note className="text-destructive">
        This question’s options were being filtered by an earlier answer, and that answer can no
        longer decide them. Saving will put every option back on offer.
      </Note>
    ) : null;
  }

  if (filter.key && !parent) {
    return (
      <div className="block space-y-2 rounded-md border border-border bg-background/60 p-3">
        <Label>Which options to offer</Label>
        <Note className="text-destructive">
          The question this depended on can no longer decide these options — it is neither a choice
          question nor a number any more. Saving will put every option back on offer.
        </Note>
        <Button variant="outline" size="sm" onClick={() => onChange({ ...ALL_OPTIONS })}>
          Offer all of them now
        </Button>
      </div>
    );
  }

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

  /** One range edited in place. Everything about bands goes through here. */
  function setBand(at: number, patch: Partial<OptionBand>) {
    onChange({
      ...filter,
      bands: filter.bands.map((band, index) => (index === at ? { ...band, ...patch } : band)),
    });
  }

  return (
    <div className="block space-y-2 rounded-md border border-border bg-background/60 p-3">
      <div>
        <Label>Which options to offer</Label>
        <Select
          value={filter.key}
          // The groups and ranges go with the question they were written
          // against. Keeping them would leave ticks against answers that no
          // longer exist, or ranges against something that is not a number.
          onChange={(event) =>
            onChange(
              event.target.value
                ? { key: event.target.value, groups: {}, bands: [] }
                : { ...ALL_OPTIONS }
            )
          }
          className="mt-1.5 w-full"
        >
          <option value="">— offer all of them —</option>
          {keys.map((key) => (
            <option key={key.key} value={key.key}>
              Depends on: {key.label}
              {key.numeric ? " (a number)" : ""}
            </option>
          ))}
        </Select>
      </div>

      {parent ? (
        field.options.length === 0 ? (
          <Note>Add some options above first — there is nothing to sort into groups yet.</Note>
        ) : parent.numeric ? (
          <>
            {filter.bands.map((band, at) => (
              <div key={at} className="mt-2 rounded-md border border-border p-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted-fg">
                    From
                  </span>
                  <Input
                    type="number"
                    value={band.min}
                    onChange={(event) => setBand(at, { min: event.target.value })}
                    placeholder="any"
                    aria-label={`Range ${at + 1}: the lowest number`}
                    className="h-8 w-20 text-xs"
                  />
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted-fg">
                    to
                  </span>
                  <Input
                    type="number"
                    value={band.max}
                    onChange={(event) => setBand(at, { max: event.target.value })}
                    placeholder="any"
                    aria-label={`Range ${at + 1}: the highest number`}
                    className="h-8 w-20 text-xs"
                  />

                  <Button
                    variant="ghost"
                    size="xs"
                    className="ml-auto"
                    onClick={() =>
                      onChange({
                        ...filter,
                        bands: filter.bands.filter((_, index) => index !== at),
                      })
                    }
                  >
                    Remove
                  </Button>
                </div>

                <p className="mb-1.5 mt-2 text-[11px] font-medium uppercase tracking-wide text-muted-fg">
                  If it is {bandLabel(band)}, offer
                </p>
                <Chips
                  all={field.options}
                  picked={band.options}
                  onToggle={(option) =>
                    setBand(at, {
                      options: band.options.includes(option)
                        ? band.options.filter((entry) => entry !== option)
                        : [...band.options, option],
                    })
                  }
                />

                {!bandIsSet(band) ? (
                  <Note className="mt-2 text-destructive">
                    No numbers in this range yet, so it offers nothing and is dropped when the form
                    is saved. Fill in the lowest, the highest, or both — a blank end means no end.
                  </Note>
                ) : band.min !== "" && band.max !== "" && Number(band.min) > Number(band.max) ? (
                  <Note className="mt-2 text-destructive">
                    The lowest is above the highest, so no answer can fall in it.
                  </Note>
                ) : band.options.length === 0 ? (
                  <Note className="mt-2">
                    Nothing ticked, so this range is dropped when the form is saved.
                  </Note>
                ) : null}
              </div>
            ))}

            <Button
              variant="outline"
              size="sm"
              disabled={filter.bands.length >= MAX_OPTION_BANDS}
              title={
                filter.bands.length >= MAX_OPTION_BANDS
                  ? `${MAX_OPTION_BANDS} ranges is the limit.`
                  : undefined
              }
              onClick={() =>
                onChange({ ...filter, bands: [...filter.bands, { min: "", max: "", options: [] }] })
              }
            >
              Add a range
            </Button>

            <Note>
              {always.length > 0
                ? `Unticked everywhere, so always offered: ${always.join(", ")}.`
                : "Every option belongs to a range, so this question offers nothing at all until they have answered the one above."}
            </Note>

            <Note>
              Both ends count: 12 to 16 includes 12 and 16, so “under 18” is a highest of 17 and the
              next range starts at 18. A blank end is no end at all — leave the highest empty for
              “18 and above”. Ranges may overlap; anything they both offer is offered once.
            </Note>

            <Note>
              An answer that is not a number — nothing filled in yet, most often — matches no range,
              so only the always-offered options show until it is. Enforced on the server too: an
              option that was not on offer is not an answer.
            </Note>
          </>
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
              {always.length > 0
                ? `Unticked everywhere, so always offered: ${always.join(", ")}.`
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
