import { errorResponse, requireDb, serverError } from "@/lib/api/guard";
import { getPublishedPaper, saveResult } from "@/lib/db/store";
import { gradeQuiz } from "@/lib/quiz/grade";
import { checkAnswers, checkStudentName, wrongQuestionNumbers } from "@/lib/quiz/records";

export const dynamic = "force-dynamic";

/**
 * 학생: 모든 문항의 답을 한 번에 제출합니다. 서버가 채점하고 결과를 저장한 뒤에만
 * 점수·정답·해설을 돌려줍니다. 저장에 실패하면 결과를 보내지 않으므로 학생은 다시 제출할 수 있습니다.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const check = requireDb();
  if ("response" in check) return check.response;
  const { id } = await params;

  const body = (await request.json().catch(() => null)) as { name?: unknown; answers?: unknown } | null;
  const name = checkStudentName(body?.name);
  if (!name.ok) return errorResponse(400, name.error);

  let quiz;
  try {
    quiz = await getPublishedPaper(check.db, id);
  } catch (error) {
    return serverError("submit load", error, "결과를 저장하지 못했습니다. 다시 시도해 주세요.");
  }
  if (!quiz) return errorResponse(404, "이 문제지는 지금 제출할 수 없습니다. 선생님께 문의해 주세요.");

  const answers = checkAnswers(body?.answers, quiz.questions.length);
  if (!answers) return errorResponse(400, "모든 문항에 답한 뒤 제출해 주세요.");

  const result = gradeQuiz(quiz.questions, answers);
  try {
    await saveResult(check.db, {
      paperId: id,
      paperTitle: quiz.title,
      studentName: name.name,
      nameKey: name.key,
      answers,
      score: result.score,
      correctCount: result.correctCount,
      total: result.total,
      wrongQuestions: wrongQuestionNumbers(result),
    });
  } catch (error) {
    return serverError("submit save", error, "결과를 저장하지 못했습니다. 다시 시도해 주세요.");
  }

  return Response.json({ ok: true, quiz, result });
}
