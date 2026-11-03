// Azure 응답을 해석하는 규칙입니다. 서버 연결과 분리되어 있어 가짜 응답으로 테스트합니다.

export type AiFailure =
  | "not-configured"
  | "unauthorized"
  | "forbidden"
  | "rate-limited"
  | "timeout"
  | "blocked"
  | "bad-response"
  | "server-error";

export type AiResult = { ok: true; raw: unknown } | { ok: false; reason: AiFailure; status?: number };

/** 실패한 HTTP 응답을 이유별로 나눕니다. */
export function classifyHttpError(status: number, detail: string): AiResult {
  if (status === 401) return { ok: false, reason: "unauthorized", status };
  if (status === 403) return { ok: false, reason: "forbidden", status };
  if (status === 429) return { ok: false, reason: "rate-limited", status };
  if (status === 408 || status === 504) return { ok: false, reason: "timeout", status };
  if (status === 400 && /content_filter|ResponsibleAIPolicyViolation/i.test(detail)) {
    return { ok: false, reason: "blocked", status };
  }
  return { ok: false, reason: "server-error", status };
}

type Completion = {
  choices?: { finish_reason?: string; message?: { content?: string | null; refusal?: string | null } }[];
} | null;

/** 성공한 응답에서 문제지 JSON을 꺼냅니다. 끊기거나 거절되었거나 JSON이 아니면 실패로 봅니다. */
export function readCompletion(data: unknown): AiResult {
  const choice = (data as Completion)?.choices?.[0];
  if (!choice) return { ok: false, reason: "bad-response" };
  if (choice.finish_reason === "content_filter" || choice.message?.refusal) return { ok: false, reason: "blocked" };
  if (choice.finish_reason === "length") return { ok: false, reason: "bad-response" };
  const content = choice.message?.content;
  if (!content) return { ok: false, reason: "bad-response" };
  try {
    return { ok: true, raw: JSON.parse(content) };
  } catch {
    return { ok: false, reason: "bad-response" };
  }
}

/** 실패 이유별 쉬운 안내 */
export const AI_FAILURE_MESSAGES: Record<AiFailure, string> = {
  "not-configured": "AI 출제 연결 설정이 아직 끝나지 않았습니다. 설정을 확인해 주세요.",
  unauthorized: "AI 서비스 인증에 실패했습니다(401). 비밀키가 맞는지 확인해 주세요.",
  forbidden: "AI 서비스 사용 권한이 없습니다(403). 강사님께 사용 권한을 확인해 주세요.",
  "rate-limited": "AI 서비스 이용량 한도에 걸렸습니다(429). 잠시 기다린 뒤 [다시 시도]를 눌러 주세요.",
  timeout: "AI 응답이 너무 오래 걸려 중단했습니다. 잠시 뒤 [다시 시도]를 눌러 주세요.",
  blocked: "AI 서비스가 이 자료로는 문제를 만들 수 없다고 응답했습니다. 다른 학습자료로 시도해 주세요.",
  "bad-response": "AI가 올바른 형식의 문제지를 만들지 못했습니다. [다시 시도]를 눌러 주세요.",
  "server-error": "AI 서비스에 연결하지 못했습니다. 잠시 뒤 [다시 시도]를 눌러 주세요.",
};
