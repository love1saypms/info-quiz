import { errorResponse, requireTeacher, serverError } from "@/lib/api/guard";
import { getPaperResults, getPaperTitle } from "@/lib/db/store";

export const dynamic = "force-dynamic";

/** 교사: 한 문제지의 학생별 최신 결과와 평균 점수 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacher(request);
  if ("response" in auth) return auth.response;

  const { id } = await params;
  try {
    const title = await getPaperTitle(auth.db, id);
    if (title === null) return errorResponse(404, "문제지를 찾을 수 없습니다.");
    const summary = await getPaperResults(auth.db, id);
    return Response.json({
      ok: true,
      title,
      average: summary.average,
      rows: summary.rows.map((r) => ({
        studentName: r.studentName,
        score: r.score,
        wrongQuestions: r.wrongQuestions,
        submittedAt: r.submittedAt,
      })),
    });
  } catch (error) {
    return serverError("teacher/results GET", error, "결과를 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
  }
}
