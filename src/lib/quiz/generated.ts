// AI가 만든 문제지를 저장하기 전에 확인하는 규칙입니다. 화면·서버·AI와 분리되어 있어 테스트로 확인합니다.
import { parseQuestionPaper } from "./parse.ts";
import { titleKey } from "./records.ts";
import type { Quiz } from "./types";

/** AI가 만드는 문제지의 문항 수 (src/lib/ai/limits.ts의 GENERATED_QUESTION_COUNT와 같은 값) */
export const REQUIRED_QUESTIONS = 10;

export type GeneratedCheck = { ok: true; quiz: Quiz } | { ok: false; reason: "format" | "duplicate-title"; errors: string[] };

/**
 * AI 응답(또는 교사가 저장하려는 생성 결과)이 정해진 형식인지 확인합니다.
 * 기존 문제지 검사(제목, 보기 4개, 정답 1~4, 해설)에 더해 문항이 정확히 10개여야 하고,
 * 이미 있는 문제지와 제목이 같으면 안 됩니다.
 */
export function checkGeneratedPaper(raw: unknown, existingTitles: string[] = []): GeneratedCheck {
  let text: string;
  try {
    text = typeof raw === "string" ? raw : JSON.stringify(raw);
  } catch {
    return { ok: false, reason: "format", errors: ["문제지 내용을 읽을 수 없습니다."] };
  }
  if (typeof text !== "string") return { ok: false, reason: "format", errors: ["문제지 내용이 비어 있습니다."] };

  const parsed = parseQuestionPaper(text);
  if (!parsed.ok) return { ok: false, reason: "format", errors: parsed.errors };

  const count = parsed.quiz.questions.length;
  if (count !== REQUIRED_QUESTIONS) {
    return {
      ok: false,
      reason: "format",
      errors: [`문항은 정확히 ${REQUIRED_QUESTIONS}개여야 하는데 ${count}개입니다.`],
    };
  }

  const key = titleKey(parsed.quiz.title);
  if (existingTitles.some((t) => titleKey(t) === key)) {
    return {
      ok: false,
      reason: "duplicate-title",
      errors: [`이미 같은 제목("${parsed.quiz.title}")의 문제지가 있습니다.`],
    };
  }
  return { ok: true, quiz: parsed.quiz };
}
