import { db } from "~/db";
import {
  quizzes,
  quizQuestions,
  quizOptions,
  quizAttempts,
  quizAnswers,
} from "~/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";

export function getQuizByLessonId(lessonId: number) {
  return db.select().from(quizzes).where(eq(quizzes.lessonId, lessonId)).get();
}

/**
 * The quiz with this id, but only if it belongs to this lesson, so a quiz
 * elsewhere can't be reached by posting its id to another lesson's route.
 */
export function getLessonQuiz(quizId: number, lessonId: number) {
  return db
    .select()
    .from(quizzes)
    .where(and(eq(quizzes.id, quizId), eq(quizzes.lessonId, lessonId)))
    .get();
}

export function getQuizWithQuestions(quizId: number) {
  const quiz = db.select().from(quizzes).where(eq(quizzes.id, quizId)).get();
  if (!quiz) return null;

  const questions = db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quizId))
    .orderBy(quizQuestions.position)
    .all();

  const options =
    questions.length > 0
      ? db
          .select()
          .from(quizOptions)
          .where(
            inArray(
              quizOptions.questionId,
              questions.map((q) => q.id)
            )
          )
          .all()
      : [];
  const questionsWithOptions = questions.map((question) => ({
    ...question,
    options: options.filter((o) => o.questionId === question.id),
  }));

  return { ...quiz, questions: questionsWithOptions };
}

export function getBestAttempt(userId: number, quizId: number) {
  return db
    .select()
    .from(quizAttempts)
    .where(
      and(eq(quizAttempts.userId, userId), eq(quizAttempts.quizId, quizId))
    )
    .orderBy(desc(quizAttempts.score))
    .limit(1)
    .get();
}

export function calculateGrade(score: number): string {
  if (score >= 0.9) return "A";
  if (score >= 0.8) return "B";
  if (score >= 0.7) return "C";
  if (score >= 0.6) return "D";
  return "F";
}

export type QuestionResult = {
  questionId: number;
  correct: boolean;
  selectedOptionId: number | null;
  correctOptionId: number | null;
};

function getCorrectOptionIds(questionIds: number[]): Map<number, number> {
  if (questionIds.length === 0) return new Map();
  const rows = db
    .select({ id: quizOptions.id, questionId: quizOptions.questionId })
    .from(quizOptions)
    .where(
      and(
        inArray(quizOptions.questionId, questionIds),
        eq(quizOptions.isCorrect, true)
      )
    )
    .all();
  const byQuestion = new Map<number, number>();
  for (const row of rows) {
    if (!byQuestion.has(row.questionId)) byQuestion.set(row.questionId, row.id);
  }
  return byQuestion;
}

function scoreQuestions(
  questions: { id: number }[],
  selectedAnswers: Record<number, number>
): QuestionResult[] {
  const correctOptionIds = getCorrectOptionIds(questions.map((q) => q.id));
  return questions.map((q) => {
    const selected = selectedAnswers[q.id];
    if (!selected) {
      return {
        questionId: q.id,
        correct: false,
        selectedOptionId: null,
        correctOptionId: null,
      };
    }
    const correctOptionId = correctOptionIds.get(q.id) ?? null;
    return {
      questionId: q.id,
      correct: selected === correctOptionId,
      selectedOptionId: selected,
      correctOptionId,
    };
  });
}

type AttemptRecord = {
  userId: number;
  quizId: number;
  score: number;
  passed: boolean;
  questionResults: QuestionResult[];
};

function recordAttempt({
  userId,
  quizId,
  score,
  passed,
  questionResults,
}: AttemptRecord) {
  return db.transaction((tx) => {
    const attempt = tx
      .insert(quizAttempts)
      .values({ userId, quizId, score, passed })
      .returning()
      .get();
    const answers = questionResults.flatMap((result) =>
      result.selectedOptionId === null
        ? []
        : [
            {
              attemptId: attempt.id,
              questionId: result.questionId,
              selectedOptionId: result.selectedOptionId,
            },
          ]
    );
    if (answers.length > 0) tx.insert(quizAnswers).values(answers).run();
    return attempt;
  });
}

export function computeResult(
  userId: number,
  quizId: number,
  selectedAnswers: Record<number, number>
) {
  try {
    const quiz = db.select().from(quizzes).where(eq(quizzes.id, quizId)).get();
    if (!quiz) {
      console.error("quiz not found");
      return null;
    }

    const questions = db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, quizId))
      .orderBy(quizQuestions.position)
      .all();

    const questionResults = scoreQuestions(questions, selectedAnswers);
    const correct = questionResults.filter((r) => r.correct).length;
    const total = questions.length;
    const scoreValue = total > 0 ? correct / total : 0;
    const passed = scoreValue > 0.7;

    const attempt = recordAttempt({
      userId,
      quizId,
      score: scoreValue,
      passed,
      questionResults,
    });

    return {
      attemptId: attempt.id,
      score: scoreValue,
      passed,
      grade: calculateGrade(scoreValue),
      totalCorrect: correct,
      totalQuestions: total,
      questionResults,
    };
  } catch (error) {
    console.error(error);
    return null;
  }
}
