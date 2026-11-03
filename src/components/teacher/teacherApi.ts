"use client";

import type { GetToken } from "../TeacherGate";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string; errors?: string[]; reason?: string };

/** 교사 기능 요청. 매번 로그인 표를 붙여 보내고, 서버가 교사 계정인지 확인합니다. */
export async function teacherFetch<T>(getToken: GetToken, url: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  try {
    const token = await getToken();
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      // 파일(FormData)은 브라우저가 형식을 정하므로 JSON일 때만 직접 적습니다.
      headers: {
        ...(typeof init.body === "string" ? { "Content-Type": "application/json" } : {}),
        Authorization: `Bearer ${token}`,
      },
    });
    const data = (await response.json().catch(() => ({}))) as { message?: string; errors?: string[]; reason?: string } & T;
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message: data.message ?? "요청을 처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.",
        errors: data.errors,
        reason: data.reason,
      };
    }
    return { ok: true, data };
  } catch {
    return { ok: false, status: 0, message: "서버에 연결하지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요." };
  }
}
