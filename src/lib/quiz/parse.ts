import type { Choice, Question, Quiz } from "./types";

export const MAX_QUESTIONS = 100;
export const OPTION_COUNT = 4;

export type ParseResult =
  | { ok: true; quiz: Quiz }
  | { ok: false; errors: string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function validateQuestion(raw: unknown, no: number): { question?: Question; errors: string[] } {
  const prefix = `${no}번 문항`;
  if (!isRecord(raw)) {
    return { errors: [`${prefix}: 문항을 읽을 수 없습니다. 문제 파일 형식을 확인해주세요.`] };
  }

  const errors: string[] = [];

  if (!isNonEmptyString(raw.question)) {
    errors.push(`${prefix}: 문제 내용이 비어 있습니다.`);
  }

  const options = raw.options;
  if (!Array.isArray(options)) {
    errors.push(`${prefix}: 보기가 없습니다. 보기는 ${OPTION_COUNT}개가 있어야 합니다.`);
  } else if (options.length !== OPTION_COUNT) {
    errors.push(`${prefix}: 보기는 ${OPTION_COUNT}개가 있어야 하는데 ${options.length}개입니다.`);
  } else {
    options.forEach((option, i) => {
      if (!isNonEmptyString(option)) {
        errors.push(`${prefix}: ${i + 1}번째 보기가 비어 있습니다.`);
      }
    });
  }

  const answer = raw.correctAnswer;
  if (typeof answer !== "number" || !Number.isInteger(answer) || answer < 1 || answer > OPTION_COUNT) {
    errors.push(`${prefix}: 정답 번호는 1, 2, 3, 4 중 하나여야 합니다. (지금 적힌 값: ${answer === undefined ? "없음" : JSON.stringify(answer)})`);
  }

  if (!isNonEmptyString(raw.explanation)) {
    errors.push(`${prefix}: 해설이 비어 있습니다.`);
  }

  if (errors.length > 0) return { errors };

  // 정해진 4개 항목만 남기고 나머지 필드는 무시합니다.
  return {
    errors,
    question: {
      question: raw.question as string,
      options: [...(options as string[])] as Question["options"],
      correctAnswer: answer as Choice,
      explanation: raw.explanation as string,
    },
  };
}

/** 문제지 파일 내용(JSON 문자열)을 검사합니다. 하나라도 잘못되면 문제지 전체를 쓰지 않습니다. */
export function parseQuestionPaper(text: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text.replace(/^\uFEFF/, ""));
  } catch {
    return {
      ok: false,
      errors: ["문제지 파일 내용을 읽을 수 없습니다. 쉼표(,)나 따옴표(\")가 빠졌거나 잘못 들어갔을 수 있습니다."],
    };
  }

  if (!isRecord(data) || !Array.isArray(data.questions)) {
    return { ok: false, errors: ["문제지 파일에서 문제 목록을 찾을 수 없습니다."] };
  }

  const errors: string[] = [];
  if (!isNonEmptyString(data.title)) {
    errors.push("문제지 제목이 없습니다.");
  }

  const rawQuestions = data.questions;
  if (rawQuestions.length === 0) {
    return { ok: false, errors: [...errors, "문제지에 문제가 하나도 없습니다."] };
  }
  if (rawQuestions.length > MAX_QUESTIONS) {
    return { ok: false, errors: [...errors, `문제는 최대 ${MAX_QUESTIONS}개까지 넣을 수 있습니다. 이 문제지에는 ${rawQuestions.length}개가 있습니다.`] };
  }

  const questions: Question[] = [];
  rawQuestions.forEach((raw, i) => {
    const result = validateQuestion(raw, i + 1);
    errors.push(...result.errors);
    if (result.question) questions.push(result.question);
  });

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, quiz: { title: (data.title as string).trim(), questions } };
}
