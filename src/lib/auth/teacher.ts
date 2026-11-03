// 교사 계정 허용 여부를 판단하는 규칙입니다. 화면과 서버 어디에도 묶이지 않아 테스트로 확인합니다.

export type TeacherCheck =
  | { ok: true; email: string }
  | { ok: false; reason: "not-configured" | "unauthenticated" | "forbidden" };

/** 로그인 정보에 들어 있는 항목 중 판단에 쓰는 것만 받습니다. */
export type TokenClaims = {
  email?: unknown;
  email_verified?: unknown;
};

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * 확인된 이메일이 허용된 교사 이메일 1개와 같을 때만 통과시킵니다.
 * 허용 이메일이 비어 있으면 아무도 통과시키지 않습니다.
 */
export function checkTeacherClaims(claims: TokenClaims, allowedEmail: string | undefined): TeacherCheck {
  const allowed = allowedEmail ? normalizeEmail(allowedEmail) : "";
  if (!allowed) return { ok: false, reason: "not-configured" };
  if (typeof claims.email !== "string" || claims.email_verified !== true) {
    return { ok: false, reason: "forbidden" };
  }
  const email = normalizeEmail(claims.email);
  return email === allowed ? { ok: true, email } : { ok: false, reason: "forbidden" };
}
