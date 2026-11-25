import {
  noteDraft,
  type NoteDraft,
  type NoteDraftKind,
} from "./lib/note-draft";

export type { NoteDraft, NoteDraftKind };

/**
 * Where the draft in the Notes panel stands against the Note the Student last
 * saved: whether it can be saved, and how many characters are left.
 */
export function describeNoteDraft({
  savedBody,
  draft,
  maxLength,
}: {
  savedBody: string | null;
  draft: string;
  maxLength: number;
}): NoteDraft {
  return noteDraft(savedBody, draft, maxLength);
}
