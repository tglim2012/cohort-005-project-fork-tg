/**
 * Where a Student's Note draft stands against the Note they last saved.
 *
 * - `empty`: nothing saved and nothing typed.
 * - `saved`: the draft is the saved Note.
 * - `unsaved`: the draft differs from the saved Note and can be saved.
 * - `cleared`: the draft is blank but a Note was saved. The save action
 *   rejects a blank Note, so there is nothing to save.
 * - `too-long`: the draft is over the limit and the save action would reject it.
 */
export type NoteDraftKind =
  | "empty"
  | "saved"
  | "unsaved"
  | "cleared"
  | "too-long";

export type NoteDraft = {
  kind: NoteDraftKind;
  canSave: boolean;
  /** Negative when the draft is over the limit. */
  charactersLeft: number;
};

// The save action trims before it checks the length and stores the trimmed
// body, so the comparison and the count trim too.
export function noteDraft(
  savedBody: string | null,
  draft: string,
  maxLength: number
): NoteDraft {
  const body = draft.trim();
  const charactersLeft = maxLength - body.length;
  const result = (kind: NoteDraftKind): NoteDraft => ({
    kind,
    canSave: kind === "unsaved",
    charactersLeft,
  });

  if (charactersLeft < 0) return result("too-long");
  if (savedBody === null) return result(body === "" ? "empty" : "unsaved");
  if (body === savedBody) return result("saved");
  if (body === "") return result("cleared");
  return result("unsaved");
}
