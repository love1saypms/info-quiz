import type { Answers, GradeResult, Question } from "./types";

/** 파일에 포함된 정답으로 채점합니다. 모든 문항의 배점은 같습니다. */
export function gradeQuiz(questions: Question[], answers: Answers): GradeResult {
  const items = questions.map((q, i) => {
    const selected = answers[i] ?? null;
    return {
      selected,
      correctAnswer: q.correctAnswer,
      isCorrect: selected === q.correctAnswer,
    };
  });
  const total = questions.length;
  const correctCount = items.filter((item) => item.isCorrect).length;
  const score = total === 0 ? 0 : Math.round((correctCount / total) * 100);
  return { total, correctCount, score, items };
}
