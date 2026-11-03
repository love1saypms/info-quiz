import "server-only";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { checkTeacherClaims, type TeacherCheck } from "./teacher.ts";

// Firebase 로그인 표(ID 토큰)를 확인할 때 쓰는 Google 공개 열쇠 주소입니다. 비밀값이 아닙니다.
const FIREBASE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

/**
 * 서버에서 교사 요청을 확인합니다. 요청 머리글의 "Authorization: Bearer <로그인 표>"를 읽어
 * Firebase가 발급한 진짜 로그인 표인지, 허용된 교사 이메일인지 확인합니다.
 * 앞으로 만들 교사 기능(문제 등록, 결과 조회)의 서버 코드도 이 함수를 먼저 거칩니다.
 */
export async function verifyTeacherRequest(request: Request): Promise<TeacherCheck> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const allowedEmail = process.env.TEACHER_EMAIL;
  if (!projectId || !allowedEmail) return { ok: false, reason: "not-configured" };

  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return { ok: false, reason: "unauthenticated" };

  try {
    const { payload } = await jwtVerify(match[1], FIREBASE_JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      algorithms: ["RS256"],
    });
    return checkTeacherClaims({ email: payload.email, email_verified: payload.email_verified }, allowedEmail);
  } catch {
    return { ok: false, reason: "unauthenticated" };
  }
}
