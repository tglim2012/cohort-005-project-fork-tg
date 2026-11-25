import { useCallback, useEffect, useState } from "react";
import { Link, useFetcher, useNavigate } from "react-router";
import {
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Github,
} from "lucide-react";
import type { Route } from "../../routes/+types/courses.$slug.lessons.$lessonId";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { YouTubePlayer } from "~/components/youtube-player";
import { LessonProgressStatus } from "~/db/schema";
import { formatDuration } from "~/lib/utils";
import { CurriculumSidebar } from "./curriculum-sidebar";
import { LessonBreadcrumb } from "./locked-lesson";
import { LessonDiscussionAndNotes } from "./lesson-discussion-and-notes";
import { QuizSection } from "./quiz-section";

type LessonLoaderData = Route.ComponentProps["loaderData"];

const AUTOPLAY_KEY = "cadence-autoplay";

function useAutoplay() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    try {
      setEnabled(localStorage.getItem(AUTOPLAY_KEY) === "true");
    } catch {
      /* silently fail */
    }
  }, []);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(AUTOPLAY_KEY, String(next));
      } catch {
        /* silently fail */
      }
      return next;
    });
  }, []);

  return [enabled, toggle] as const;
}

type FullLessonData = Extract<LessonLoaderData, { view: "full" }>;
type CourseLink = FullLessonData["course"];
type LessonLink = NonNullable<FullLessonData["nextLesson"]>;

export function FullLesson({ data }: { data: FullLessonData }) {
  const {
    course,
    curriculum,
    module: mod,
    lesson,
    enrolled,
    currentUserId,
    quiz,
    bestAttempt,
    lessonProgressMap,
  } = data;

  return (
    <div className="flex">
      <CurriculumSidebar
        course={course}
        curriculum={curriculum}
        currentLessonId={lesson.id}
        lessonProgressMap={lessonProgressMap}
        enrolled={enrolled}
      />

      <div className="flex-1 p-6 lg:p-8">
        <LessonBreadcrumb
          course={course}
          mod={mod}
          lessonTitle={lesson.title}
        />

        <div className="mx-auto max-w-4xl">
          <LessonHeader data={data} />
          <LessonBody data={data} />

          {quiz && enrolled && currentUserId && (
            <LessonQuiz
              lessonId={lesson.id}
              quiz={quiz}
              bestAttempt={bestAttempt}
            />
          )}

          {enrolled && currentUserId && <MarkComplete data={data} />}

          <LessonFooter data={data} />
        </div>
      </div>
    </div>
  );
}

function LessonFooter({ data }: { data: FullLessonData }) {
  return (
    <>
      <LessonDiscussionAndNotes
        // A new lesson starts a new Note draft.
        key={data.lesson.id}
        comments={data.comments}
        currentUserId={data.currentUserId}
        canModerate={data.canModerate}
        instructorName={data.instructorName}
        note={data.note}
      />

      <LessonPager
        course={data.course}
        prevLesson={data.prevLesson}
        nextLesson={data.nextLesson}
      />
    </>
  );
}

function LessonQuiz({
  lessonId,
  quiz,
  bestAttempt,
}: {
  lessonId: number;
  quiz: NonNullable<FullLessonData["quiz"]>;
  bestAttempt: FullLessonData["bestAttempt"];
}) {
  const quizFetcher = useFetcher({ key: `quiz-${lessonId}` });

  return (
    <QuizSection
      quiz={quiz}
      bestAttempt={bestAttempt}
      quizResult={quizFetcher.data?.quizResult ?? null}
      quizFetcher={quizFetcher}
      isSubmitting={quizFetcher.state !== "idle"}
    />
  );
}

function LessonHeader({
  data: { lesson, currentUserId, bookmarked },
}: {
  data: FullLessonData;
}) {
  return (
    <>
      <div className="mb-2 flex items-start justify-between gap-3">
        <h1 className="text-3xl font-bold">{lesson.title}</h1>
        {currentUserId && <BookmarkToggle bookmarked={bookmarked} />}
      </div>
      <div className="mb-6 flex items-center gap-3">
        {lesson.durationMinutes && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="size-4" />
            {formatDuration(lesson.durationMinutes, true, false, false)}
          </div>
        )}
        {lesson.githubRepoUrl && (
          <a
            href={lesson.githubRepoUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm">
              <Github className="mr-1.5 size-4" />
              Open Code
            </Button>
          </a>
        )}
      </div>
    </>
  );
}

function LessonBody({
  data: {
    lesson,
    contentHtml,
    enrolled,
    currentUserId,
    lastWatchPosition,
    watchProgress,
  },
}: {
  data: FullLessonData;
}) {
  const [autoplay, toggleAutoplay] = useAutoplay();

  return (
    <>
      {lesson.videoUrl && (
        <YouTubePlayer
          videoUrl={lesson.videoUrl}
          lessonId={lesson.id}
          title={lesson.title}
          startPosition={lastWatchPosition}
          durationMinutes={lesson.durationMinutes}
          watchProgress={watchProgress}
          trackingEnabled={enrolled && !!currentUserId}
          autoplay={autoplay}
          onToggleAutoplay={toggleAutoplay}
        />
      )}

      {contentHtml && (
        <div
          className="prose prose-neutral dark:prose-invert mb-8 max-w-none"
          // oxlint-disable-next-line react/no-danger -- the instructor wrote this Markdown
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      )}

      {!contentHtml && !lesson.videoUrl && (
        <Card className="mb-8">
          <CardContent className="py-12 text-center text-muted-foreground">
            No content has been added to this lesson yet.
          </CardContent>
        </Card>
      )}
    </>
  );
}

function MarkComplete({
  data: { course, lesson, lessonStatus, nextLesson },
}: {
  data: FullLessonData;
}) {
  const fetcher = useFetcher({ key: `mark-complete-${lesson.id}` });
  const navigate = useNavigate();

  const isMarking =
    fetcher.state !== "idle" &&
    fetcher.formData?.get("intent") === "mark-complete";
  const justCompleted = fetcher.data?.success;
  const isCompleted =
    lessonStatus === LessonProgressStatus.Completed || justCompleted;

  useEffect(() => {
    if (justCompleted && nextLesson) {
      navigate(`/courses/${course.slug}/lessons/${nextLesson.id}`);
    }
  }, [justCompleted, nextLesson, course.slug, navigate]);

  return (
    <div className="mb-8">
      {isCompleted ? (
        <LessonCompleted course={course} nextLesson={nextLesson} />
      ) : (
        <fetcher.Form method="post">
          <input type="hidden" name="intent" value="mark-complete" />
          {nextLesson ? (
            <Button disabled={isMarking}>
              {isMarking ? (
                "Completing..."
              ) : (
                <>
                  Up next: {nextLesson.title}
                  <ChevronRight className="ml-1 size-4" />
                </>
              )}
            </Button>
          ) : (
            <Button disabled={isMarking}>
              <CheckCircle2 className="mr-2 size-4" />
              {isMarking ? "Marking..." : "Mark as Complete"}
            </Button>
          )}
        </fetcher.Form>
      )}
    </div>
  );
}

function LessonCompleted({
  course,
  nextLesson,
}: {
  course: CourseLink;
  nextLesson: LessonLink | null;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-green-600">
        <CheckCircle2 className="size-5" />
        <span className="font-medium">Lesson completed</span>
      </div>
      {nextLesson && (
        <Link to={`/courses/${course.slug}/lessons/${nextLesson.id}`}>
          <Button variant="outline" size="sm">
            Up next: {nextLesson.title}
            <ChevronRight className="ml-1 size-4" />
          </Button>
        </Link>
      )}
    </div>
  );
}

function LessonPager({
  course,
  prevLesson,
  nextLesson,
}: {
  course: CourseLink;
  prevLesson: LessonLink | null;
  nextLesson: LessonLink | null;
}) {
  return (
    <div className="flex items-center justify-between border-t pt-6">
      {prevLesson ? (
        <Link
          to={`/courses/${course.slug}/lessons/${prevLesson.id}`}
          className="flex items-center gap-2 text-sm hover:text-foreground text-muted-foreground"
        >
          <ChevronLeft className="size-4" />
          <PagerLabel label="Previous" title={prevLesson.title} />
        </Link>
      ) : (
        <div />
      )}

      {nextLesson ? (
        <Link
          to={`/courses/${course.slug}/lessons/${nextLesson.id}`}
          className="flex items-center gap-2 text-right text-sm hover:text-foreground text-muted-foreground"
        >
          <PagerLabel label="Next" title={nextLesson.title} />
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <Link
          to={`/courses/${course.slug}`}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <PagerLabel label="Back to" title={course.title} />
          <ChevronRight className="size-4" />
        </Link>
      )}
    </div>
  );
}

function PagerLabel({ label, title }: { label: string; title: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium text-foreground">{title}</div>
    </div>
  );
}

function BookmarkToggle({ bookmarked }: { bookmarked: boolean }) {
  const fetcher = useFetcher<{ ok: boolean }>();
  const isSaving = fetcher.state !== "idle";

  return (
    <fetcher.Form method="post">
      <input type="hidden" name="intent" value="toggle-bookmark" />
      <Button type="submit" variant="outline" size="sm" disabled={isSaving}>
        {bookmarked ? (
          <BookmarkCheck className="mr-1.5 size-4" />
        ) : (
          <Bookmark className="mr-1.5 size-4" />
        )}
        {bookmarked ? "Bookmarked" : "Bookmark"}
      </Button>
    </fetcher.Form>
  );
}
