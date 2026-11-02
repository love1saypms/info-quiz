import type { Choice, Question, Quiz } from "./types";

export const MAX_FILE_BYTES = 1024 * 1024;
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
    return { errors: [`${prefix}: 문항은 { } 형태의 객체여야 합니다.`] };
  }

  const errors: string[] = [];

  if (!isNonEmptyString(raw.question)) {
    errors.push(`${prefix}: question(문제 내용)이 비어 있거나 문자열이 아닙니다.`);
  }

  const options = raw.options;
  if (!Array.isArray(options)) {
    errors.push(`${prefix}: options는 보기 ${OPTION_COUNT}개를 담은 배열이어야 합니다.`);
  } else if (options.length !== OPTION_COUNT) {
    errors.push(`${prefix}: options의 보기는 ${OPTION_COUNT}개여야 합니다. (현재 ${options.length}개)`);
  } else {
    options.forEach((option, i) => {
      if (!isNonEmptyString(option)) {
        errors.push(`${prefix}: options의 ${i + 1}번째 보기가 비어 있거나 문자열이 아닙니다.`);
      }
    });
  }

  const answer = raw.correctAnswer;
  if (typeof answer !== "number" || !Number.isInteger(answer) || answer < 1 || answer > OPTION_COUNT) {
    errors.push(`${prefix}: correctAnswer는 1~${OPTION_COUNT} 사이의 숫자여야 합니다. (현재 ${JSON.stringify(answer) ?? "없음"})`);
  }

  if (!isNonEmptyString(raw.explanation)) {
    errors.push(`${prefix}: explanation(해설)이 비어 있거나 문자열이 아닙니다.`);
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

/** 문제 파일 내용(JSON 문자열)을 검사합니다. 하나라도 잘못되면 파일 전체를 거부합니다. */
export function parseQuizFile(text: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text.replace(/^﻿/, ""));
  } catch (e) {
    const detail = e instanceof Error ? ` (${e.message})` : "";
    return { ok: false, errors: [`JSON 형식이 올바르지 않습니다.${detail}`] };
  }

  if (!isRecord(data) || !Array.isArray(data.questions)) {
    return { ok: false, errors: ["파일 최상위에 questions 배열이 있어야 합니다. 예: { \"questions\": [ ... ] }"] };
  }

  const rawQuestions = data.questions;
  if (rawQuestions.length === 0) {
    return { ok: false, errors: ["questions 배열에 문항이 없습니다."] };
  }
  if (rawQuestions.length > MAX_QUESTIONS) {
    return { ok: false, errors: [`문항은 최대 ${MAX_QUESTIONS}개까지 올릴 수 있습니다. (현재 ${rawQuestions.length}개)`] };
  }

  const questions: Question[] = [];
  const errors: string[] = [];
  rawQuestions.forEach((raw, i) => {
    const result = validateQuestion(raw, i + 1);
    errors.push(...result.errors);
    if (result.question) questions.push(result.question);
  });

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, quiz: { questions } };
}
