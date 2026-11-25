import type { PlainText } from "~/lib/text";

/**
 * A Note's body, shown as the Student typed it: plain text, never Markdown.
 * A Note is often a pasted URL, so a word longer than the card wraps instead
 * of running out of it.
 */
export function NoteBody({ body }: { body: PlainText }) {
  return <p className="whitespace-pre-wrap wrap-anywhere text-sm">{body}</p>;
}
