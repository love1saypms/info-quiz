import { errorResponse, requireTeacher, serverError } from "@/lib/api/guard";
import { setPublished } from "@/lib/db/store";

export const dynamic = "force-dynamic";

/** 교사: 문제지 공개 / 비공개 바꾸기 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacher(request);
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { published?: unknown } | null;
  if (typeof body?.published !== "boolean") return errorResponse(400, "공개 여부가 올바르지 않습니다.");

  try {
    const found = await setPublished(auth.db, id, body.published);
    if (!found) return errorResponse(404, "문제지를 찾을 수 없습니다.");
    return Response.json({ ok: true, published: body.published });
  } catch (error) {
    return serverError("teacher/papers PATCH", error, "공개 상태를 바꾸지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
  }
}
