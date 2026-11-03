import { errorResponse, requireTeacher, serverError } from "@/lib/api/guard";
import { addPaper, listAllPapers, listPaperTitles } from "@/lib/db/store";
import { checkGeneratedPaper } from "@/lib/quiz/generated";
import { parseQuestionPaper } from "@/lib/quiz/parse";
import type { Quiz } from "@/lib/quiz/types";

export const dynamic = "force-dynamic";

const MAX_FILE_CHARS = 1_000_000;

/** 교사: 등록한 문제지 목록 */
export async function GET(request: Request) {
  const auth = await requireTeacher(request);
  if ("response" in auth) return auth.response;
  try {
    return Response.json({ ok: true, papers: await listAllPapers(auth.db) });
  } catch (error) {
    return serverError("teacher/papers GET", error, "문제지 목록을 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
  }
}

/**
 * 교사: 문제지를 검사해 저장
 * - JSON 파일 업로드 `{ text }` → 비공개로 저장 (기존 방식)
 * - AI 생성 결과 `{ generated: 문제지 }` → 10문항 형식·제목 중복을 다시 확인하고 바로 공개로 저장
 */
export async function POST(request: Request) {
  const auth = await requireTeacher(request);
  if ("response" in auth) return auth.response;

  const body = (await request.json().catch(() => null)) as { text?: unknown; generated?: unknown } | null;

  let quiz: Quiz;
  let fromAi = false;
  if (body?.generated !== undefined) {
    // 화면에서 받은 생성 결과를 그대로 믿지 않고 서버에서 다시 확인합니다.
    let titles: string[];
    try {
      titles = await listPaperTitles(auth.db);
    } catch (error) {
      return serverError("teacher/papers titles", error, "문제지를 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
    }
    const checked = checkGeneratedPaper(body.generated, titles);
    if (!checked.ok) {
      return checked.reason === "duplicate-title"
        ? errorResponse(409, `${checked.errors[0]} 같은 제목으로는 저장할 수 없습니다.`, { reason: "duplicate-title" })
        : errorResponse(400, "문제지 형식이 올바르지 않아 저장할 수 없습니다.", { errors: checked.errors });
    }
    quiz = checked.quiz;
    fromAi = true;
  } else {
    const text = typeof body?.text === "string" ? body.text : "";
    if (!text) return errorResponse(400, "문제지 파일 내용이 비어 있습니다.");
    if (text.length > MAX_FILE_CHARS) return errorResponse(400, "문제지 파일이 너무 큽니다.");

    // 화면에서 미리 검사했더라도 서버에서 한 번 더 검사합니다.
    const parsed = parseQuestionPaper(text);
    if (!parsed.ok) return errorResponse(400, "문제지 파일에 고쳐야 할 내용이 있습니다.", { errors: parsed.errors });
    quiz = parsed.quiz;
  }

  try {
    const result = await addPaper(auth.db, quiz, auth.email, fromAi ? { published: true, source: "ai" } : {});
    if (!result.ok) {
      const message =
        result.reason === "duplicate-title"
          ? `이미 같은 제목("${quiz.title}")의 문제지가 등록되어 있습니다. 제목을 바꾸거나 덮어쓰지 않았습니다.`
          : "이미 같은 내용의 문제지가 등록되어 있습니다.";
      return errorResponse(409, message, { reason: result.reason });
    }
    return Response.json({ ok: true, id: result.id, published: fromAi }, { status: 201 });
  } catch (error) {
    return serverError("teacher/papers POST", error, "문제지를 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
  }
}
