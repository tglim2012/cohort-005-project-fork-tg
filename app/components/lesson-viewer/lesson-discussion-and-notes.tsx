import { MessageSquare, NotebookPen } from "lucide-react";
import {
  CommentThread,
  type RenderedComment,
} from "~/components/comment-thread";
import { Card, CardContent } from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { LessonNotes, type SavedNote } from "./lesson-notes";

/**
 * The panel under a lesson: the lesson's Questions & Discussion and, for a
 * signed-in person, their own Note, as two tabs of one card. The Notes tab
 * stays mounted while hidden (`forceMount`), so an unsaved draft survives a
 * look at the discussion.
 */
export function LessonDiscussionAndNotes({
  comments,
  currentUserId,
  canModerate,
  instructorName,
  note,
}: {
  comments: RenderedComment[];
  currentUserId: number | null;
  canModerate: boolean;
  instructorName: string;
  note: SavedNote;
}) {
  return (
    <Card className="mb-8 py-0">
      <Tabs defaultValue="discussion" className="gap-0">
        <div className="border-b px-6 pt-5 pb-4">
          <PanelTabs
            commentCount={comments.length}
            showNotes={currentUserId !== null}
            hasNote={note !== null}
          />
        </div>

        <CardContent className="p-6">
          <TabsContent value="discussion">
            <CommentThread
              comments={comments}
              currentUserId={currentUserId}
              canModerate={canModerate}
              canPost
              instructorName={instructorName}
            />
          </TabsContent>
          {currentUserId && (
            <TabsContent
              value="notes"
              forceMount
              className="data-[state=inactive]:hidden"
            >
              <LessonNotes note={note} />
            </TabsContent>
          )}
        </CardContent>
      </Tabs>
    </Card>
  );
}

function PanelTabs({
  commentCount,
  showNotes,
  hasNote,
}: {
  commentCount: number;
  showNotes: boolean;
  hasNote: boolean;
}) {
  return (
    <TabsList className="h-10">
      <TabsTrigger value="discussion" className="px-3">
        <MessageSquare />
        Questions &amp; Discussion
        {commentCount > 0 && (
          <span className="rounded-full bg-primary/10 px-1.5 text-xs text-primary">
            {commentCount}
          </span>
        )}
      </TabsTrigger>
      {showNotes && (
        <TabsTrigger value="notes" className="px-3">
          <NotebookPen />
          Your notes
          {hasNote && (
            <span
              aria-label="You have a saved note"
              className="size-1.5 rounded-full bg-primary"
            />
          )}
        </TabsTrigger>
      )}
    </TabsList>
  );
}
