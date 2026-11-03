import "server-only";
import type { Firestore } from "firebase-admin/firestore";
import { verifyTeacherRequest } from "@/lib/auth/verifyTeacher";
import { getDb } from "@/lib/firebase/admin";

// 서버 요청 처리에서 공통으로 쓰는 확인 단계와 오류 응답입니다.

export function errorResponse(status: number, message: string, extra: Record<string, unknown> = {}) {
  return Response.json({ ok: false, message, ...extra }, { status });
}

const NOT_READY = "저장 공간 연결 설정이 아직 끝나지 않았습니다. 선생님께 알려주세요.";

/** Firestore 연결을 확인합니다. 연결이 없으면 오류 응답을 돌려줍니다. */
export function requireDb(): { db: Firestore } | { response: Response } {
  const db = getDb();
  return db ? { db } : { response: errorResponse(503, NOT_READY, { reason: "not-configured" }) };
}

/**
 * 교사 기능 요청을 처리하기 전에 서버에서 로그인과 허용된 교사 계정인지 확인합니다.
 * 통과하면 교사 이메일과 Firestore 연결을, 아니면 오류 응답을 돌려줍니다.
 */
export async function requireTeacher(
  request: Request,
): Promise<{ email: string; db: Firestore } | { response: Response }> {
  const check = await verifyTeacherRequest(request);
  if (!check.ok) {
    if (check.reason === "forbidden") return { response: errorResponse(403, "허용되지 않은 계정입니다.", { reason: "forbidden" }) };
    if (check.reason === "unauthenticated")
      return { response: errorResponse(401, "로그인이 필요합니다. 다시 로그인해 주세요.", { reason: "unauthenticated" }) };
    return { response: errorResponse(503, "교사 로그인 설정이 아직 끝나지 않았습니다.", { reason: "not-configured" }) };
  }
  const dbCheck = requireDb();
  if ("response" in dbCheck) return dbCheck;
  return { email: check.email, db: dbCheck.db };
}

/** 서버 오류를 기록하고, 학생·교사에게는 쉬운 안내만 보냅니다. */
export function serverError(where: string, error: unknown, message: string) {
  console.error(`[${where}]`, error);
  return errorResponse(500, message);
}
