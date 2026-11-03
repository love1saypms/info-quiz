import { requireDb, serverError } from "@/lib/api/guard";
import { listPublishedPapers } from "@/lib/db/store";

export const dynamic = "force-dynamic";

/** 학생: 공개된 문제지 목록 (제목과 문항 수만) */
export async function GET() {
  const check = requireDb();
  if ("response" in check) return check.response;
  try {
    return Response.json({ ok: true, papers: await listPublishedPapers(check.db) });
  } catch (error) {
    return serverError("papers GET", error, "문제지 목록을 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
  }
}
