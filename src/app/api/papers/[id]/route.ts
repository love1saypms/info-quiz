import { errorResponse, requireDb, serverError } from "@/lib/api/guard";
import { getPublishedPaper } from "@/lib/db/store";
import { toPublicQuiz } from "@/lib/quiz/records";

export const dynamic = "force-dynamic";

/** 학생: 공개된 문제지 하나. 푸는 동안 쓰는 것이므로 정답과 해설은 빼고 보냅니다. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const check = requireDb();
  if ("response" in check) return check.response;
  const { id } = await params;
  try {
    const quiz = await getPublishedPaper(check.db, id);
    if (!quiz) return errorResponse(404, "이 문제지는 지금 풀 수 없습니다. 문제지 목록에서 다시 골라 주세요.");
    return Response.json({ ok: true, quiz: toPublicQuiz(quiz) });
  } catch (error) {
    return serverError("papers/[id] GET", error, "문제지를 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
  }
}
