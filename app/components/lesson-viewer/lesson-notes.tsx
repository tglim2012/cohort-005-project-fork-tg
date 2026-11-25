import { useState } from "react";
import { useFetcher } from "react-router";
import { Check, Lock } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { MAX_NOTE_LENGTH } from "~/lib/notes";
import { cn, formatRelativeTime } from "~/lib/utils";
import { describeNoteDraft, type NoteDraft } from "~/modules/lesson-notes";

export type SavedNote = { body: string; updatedAt: string } | null;

export function LessonNotes({ note }: { note: SavedNote }) {
  const fetcher = useFetcher<{ ok: boolean; error?: string }>();
  const [draft, setDraft] = useState(note?.body ?? "");
  const isSaving = fetcher.state !== "idle";
  const error = isSaving ? undefined : fetcher.data?.error;
  const status = describeNoteDraft({
    savedBody: note?.body ?? null,
    draft,
    maxLength: MAX_NOTE_LENGTH,
  });

  return (
    <fetcher.Form method="post" className="space-y-2">
      <input type="hidden" name="intent" value="save-note" />
      <Textarea
        name="body"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        rows={6}
        placeholder="Write down what you want to remember from this lesson..."
        aria-label="Your notes on this lesson"
        className="min-h-36 resize-y"
      />

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={isSaving || !status.canSave}>
          {isSaving ? "Saving..." : "Save note"}
        </Button>

        <NoteFooter status={status} error={error} updatedAt={note?.updatedAt} />
      </div>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="size-3" />
        Only you can see your notes.
      </p>
    </fetcher.Form>
  );
}

function NoteStatus({
  status,
  updatedAt,
}: {
  status: NoteDraft;
  updatedAt: string | undefined;
}) {
  switch (status.kind) {
    case "saved":
      return (
        <span
          suppressHydrationWarning
          className="flex items-center gap-1 text-xs text-muted-foreground"
        >
          <Check className="size-3.5 text-green-600" />
          Saved{updatedAt && ` ${formatRelativeTime(updatedAt)}`}
        </span>
      );
    case "unsaved":
      return (
        <span className="text-xs text-muted-foreground">Unsaved changes</span>
      );
    case "cleared":
      return (
        <span className="text-xs text-muted-foreground">
          A note can&apos;t be empty.
        </span>
      );
    case "too-long":
      return (
        <span className="text-xs text-destructive">
          {(-status.charactersLeft).toLocaleString("en")} characters over the
          limit
        </span>
      );
    case "empty":
      return null;
  }
}

function NoteFooter({
  status,
  error,
  updatedAt,
}: {
  status: NoteDraft;
  error: string | undefined;
  updatedAt: string | undefined;
}) {
  return (
    <>
      {error ? (
        <span role="alert" className="text-sm text-destructive">
          {error}
        </span>
      ) : (
        <NoteStatus status={status} updatedAt={updatedAt} />
      )}

      <span
        className={cn(
          "ml-auto text-xs",
          status.kind === "too-long"
            ? "text-destructive"
            : "text-muted-foreground"
        )}
      >
        {MAX_NOTE_LENGTH - status.charactersLeft} / {MAX_NOTE_LENGTH}
      </span>
    </>
  );
}
