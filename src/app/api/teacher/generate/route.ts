import { errorResponse, requireTeacher, serverError } from "@/lib/api/guard";
import { AI_FAILURE_MESSAGES, generateQuizWithAzure, isAiConfigured } from "@/lib/ai/azure";
import { MAX_PDF_BYTES } from "@/lib/ai/limits";
import { readPdfText } from "@/lib/ai/pdfText";
import { listPaperTitles } from "@/lib/db/store";
import { checkGeneratedPaper } from "@/lib/quiz/generated";

export const dynamic = "force-dynamic";
// AI 응답을 기다리는 시간(120초)보다 조금 길게 둡니다.
export const maxDuration = 150;

// 파일 외에 양식 경계·이름 같은 정보가 함께 오므로 약간의 여유만 둡니다.
const MAX_REQUEST_BYTES = MAX_PDF_BYTES + 16 * 1024;

// 같은 교사가 생성 버튼을 여러 번 눌러도 한 번에 하나만 처리합니다(서버 한 대 기준).
const running = new Set<string>();

/**
 * 교사: PDF 학습자료로 AI 문제지를 만듭니다. 저장하지 않고 결과만 돌려줍니다.
 * 파일·본문 확인을 모두 통과해야 Azure를 호출하며, 실패해도 자동으로 다시 요청하지 않습니다.
 */
export async function POST(request: Request) {
  const auth = await requireTeacher(request);
  if ("response" in auth) return auth.response;

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_REQUEST_BYTES) {
    return errorResponse(413, "PDF 파일이 너무 큽니다. 512KiB 이하만 올릴 수 있습니다.");
  }

  let file: File | null = null;
  try {
    const form = await request.formData();
    const value = form.get("file");
    file = value instanceof File ? value : null;
  } catch {
    return errorResponse(400, "파일을 받지 못했습니다. PDF 파일을 다시 골라 주세요.");
  }
  if (!file) return errorResponse(400, "PDF 파일을 골라 주세요.");

  const pdf = await readPdfText(file.name, new Uint8Array(await file.arrayBuffer()));
  if (!pdf.ok) return errorResponse(400, pdf.message, { reason: "input" });

  if (!isAiConfigured()) return errorResponse(503, AI_FAILURE_MESSAGES["not-configured"], { reason: "not-configured" });
  if (running.has(auth.email)) {
    return errorResponse(409, "이미 문제를 만드는 중입니다. 끝날 때까지 기다려 주세요.", { reason: "busy" });
  }

  running.add(auth.email);
  try {
    let titles: string[];
    try {
      titles = await listPaperTitles(auth.db);
    } catch (error) {
      return serverError("generate titles", error, "기존 문제지 목록을 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
    }

    const ai = await generateQuizWithAzure(pdf.text, titles);
    if (!ai.ok) {
      const status = ai.reason === "not-configured" ? 503 : ai.reason === "timeout" ? 504 : 502;
      return errorResponse(status, AI_FAILURE_MESSAGES[ai.reason], { reason: ai.reason });
    }

    const checked = checkGeneratedPaper(ai.raw, titles);
    if (!checked.ok) {
      if (checked.reason === "duplicate-title") {
        return errorResponse(409, `AI가 만든 제목이 이미 있는 문제지와 같습니다. [다시 시도]를 눌러 주세요.`, {
          reason: "duplicate-title",
          errors: checked.errors,
        });
      }
      console.error("[generate] 형식 오류:", checked.errors.slice(0, 5));
      return errorResponse(502, AI_FAILURE_MESSAGES["bad-response"], { reason: "bad-response", errors: checked.errors });
    }

    return Response.json({ ok: true, quiz: checked.quiz, chars: [...pdf.text].length, pages: pdf.pages });
  } finally {
    running.delete(auth.email);
  }
}
