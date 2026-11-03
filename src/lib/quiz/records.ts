// 문제지 등록과 풀이 결과 저장에 쓰는 규칙입니다. 화면·서버·저장소와 분리되어 있어 테스트로 확인합니다.
import type { Answers, Choice, GradeResult, PublicQuiz, Question, Quiz } from "./types";

export const MAX_NAME_LENGTH = 20;

/** 학생에게 보낼 문제지에서 정답과 해설을 뺍니다. */
export function toPublicQuiz(quiz: Quiz): PublicQuiz {
  return {
    title: quiz.title,
    questions: quiz.questions.map((q) => ({ question: q.question, options: [...q.options] as Question["options"] })),
  };
}

/** 제목 중복을 비교할 때 쓰는 값. 대소문자·띄어쓰기 차이는 같은 제목으로 봅니다. */
export function titleKey(title: string): string {
  return title.trim().replace(/\s+/g, " ").toLowerCase();
}

/** 내용 중복을 비교할 때 쓰는 문자열. 문항 순서와 내용(문제·보기·정답·해설)이 모두 같으면 같은 값입니다. */
export function contentKey(questions: Question[]): string {
  return JSON.stringify(
    questions.map((q) => [q.question.trim(), q.options.map((o) => o.trim()), q.correctAnswer, q.explanation.trim()]),
  );
}

export type NameCheck = { ok: true; name: string; key: string } | { ok: false; error: string };

/** 학생 이름을 정리합니다. 앞뒤 공백을 지우고, 같은 이름인지 비교할 값(key)을 만듭니다. */
export function checkStudentName(raw: unknown): NameCheck {
  const name = typeof raw === "string" ? raw.trim().replace(/\s+/g, " ") : "";
  if (!name) return { ok: false, error: "이름을 입력해 주세요." };
  if (name.length > MAX_NAME_LENGTH) return { ok: false, error: `이름은 ${MAX_NAME_LENGTH}자까지 입력할 수 있습니다.` };
  return { ok: true, name, key: name.toLowerCase() };
}

/** 학생이 보낸 답이 문항 수와 맞고, 모두 1~4 중 하나인지 확인합니다. */
export function checkAnswers(raw: unknown, questionCount: number): Answers | null {
  if (!Array.isArray(raw) || raw.length !== questionCount) return null;
  const valid = raw.every((a) => a === 1 || a === 2 || a === 3 || a === 4);
  return valid ? (raw as Choice[]) : null;
}

/** 틀린 문제 번호(1부터 시작) 목록 */
export function wrongQuestionNumbers(result: GradeResult): number[] {
  return result.items.flatMap((item, i) => (item.isCorrect ? [] : [i + 1]));
}

export type ResultRow = {
  studentName: string;
  nameKey: string;
  score: number;
  wrongQuestions: number[];
  /** 제출 시각(밀리초) */
  submittedAt: number;
};

/**
 * 학생 이름별 최신 완료 결과만 남겨 이름 순으로 정렬하고, 그 결과로 평균 점수를 구합니다.
 * 평균은 소수 첫째 자리까지 반올림합니다. 결과가 없으면 평균은 null입니다.
 */
export function summarizeResults(rows: ResultRow[]): { rows: ResultRow[]; average: number | null } {
  const latest = new Map<string, ResultRow>();
  for (const row of rows) {
    const prev = latest.get(row.nameKey);
    if (!prev || row.submittedAt > prev.submittedAt) latest.set(row.nameKey, row);
  }
  const list = [...latest.values()].sort((a, b) => a.studentName.localeCompare(b.studentName, "ko"));
  if (list.length === 0) return { rows: list, average: null };
  const sum = list.reduce((acc, row) => acc + row.score, 0);
  return { rows: list, average: Math.round((sum / list.length) * 10) / 10 };
}
