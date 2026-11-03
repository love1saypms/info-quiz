import { verifyTeacherRequest } from "@/lib/auth/verifyTeacher";

// 교사 화면이 열릴 때 서버에서 로그인 상태와 허용된 계정인지 확인합니다.
export const dynamic = "force-dynamic";

const STATUS = { "not-configured": 503, unauthenticated: 401, forbidden: 403 } as const;

export async function GET(request: Request) {
  const check = await verifyTeacherRequest(request);
  if (check.ok) {
    return Response.json({ ok: true, email: check.email });
  }
  return Response.json({ ok: false, reason: check.reason }, { status: STATUS[check.reason] });
}
