"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";

type Status =
  | { kind: "loading" }
  | { kind: "not-configured" }
  | { kind: "signed-out"; message?: string }
  | { kind: "checking" }
  | { kind: "allowed"; email: string }
  | { kind: "forbidden"; email: string }
  | { kind: "error"; message: string };

// 서버에 로그인 표를 보내 허용된 교사인지 확인합니다. 서버가 허용해야만 교사 화면을 보여줍니다.
async function askServer(user: User): Promise<Status> {
  const token = await user.getIdToken();
  const response = await fetch("/api/teacher/session", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = (await response.json().catch(() => ({}))) as { ok?: boolean; email?: string; reason?: string };
  if (response.ok && data.ok && data.email) return { kind: "allowed", email: data.email };
  if (data.reason === "forbidden") return { kind: "forbidden", email: user.email ?? "" };
  if (data.reason === "not-configured") return { kind: "not-configured" };
  return { kind: "error", message: "로그인 상태를 확인하지 못했습니다. 다시 로그인해 주세요." };
}

/** 교사 기능 요청에 붙일 로그인 표를 가져옵니다. 서버는 이 표로 교사 계정인지 다시 확인합니다. */
export type GetToken = () => Promise<string>;

type ChildrenProps = { email: string; logout: () => void; getToken: GetToken };

export default function TeacherGate({ children }: { children: (props: ChildrenProps) => ReactNode }) {
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const auth = getFirebaseAuth();

  const getToken = useCallback<GetToken>(async () => {
    const user = auth?.currentUser;
    if (!user) throw new Error("로그인이 필요합니다.");
    return user.getIdToken();
  }, [auth]);

  useEffect(() => {
    if (!auth) {
      setStatus({ kind: "not-configured" });
      return;
    }
    return onAuthStateChanged(auth, (user) => {
      if (!user) {
        setStatus((prev) => (prev.kind === "signed-out" ? prev : { kind: "signed-out" }));
        return;
      }
      setStatus({ kind: "checking" });
      askServer(user)
        .then(setStatus)
        .catch(() => setStatus({ kind: "error", message: "서버에 연결하지 못했습니다. 잠시 뒤 다시 시도해 주세요." }));
    });
  }, [auth]);

  async function login() {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      const code = (error as { code?: string }).code ?? "";
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return;
      const message =
        code === "auth/popup-blocked"
          ? "로그인 창이 막혔습니다. 브라우저에서 팝업을 허용한 뒤 다시 눌러 주세요."
          : code === "auth/unauthorized-domain"
            ? "이 주소는 Firebase에 로그인 허용 주소로 등록되지 않았습니다. 선생님께 알려주세요."
            : "로그인하지 못했습니다. 다시 시도해 주세요.";
      setStatus({ kind: "signed-out", message });
    }
  }

  function logout() {
    if (auth) void signOut(auth);
    setStatus({ kind: "signed-out", message: "로그아웃했습니다." });
  }

  switch (status.kind) {
    case "loading":
    case "checking":
      return (
        <section className="card">
          <p className="muted">로그인 상태를 확인하고 있습니다…</p>
        </section>
      );
    case "not-configured":
      return (
        <section className="card">
          <h2>교사 로그인 준비 중</h2>
          <p className="muted">교사 로그인 설정이 아직 끝나지 않았습니다. 설정을 마친 뒤 다시 열어 주세요.</p>
        </section>
      );
    case "allowed":
      return <>{children({ email: status.email, logout, getToken })}</>;
    case "forbidden":
      return (
        <section className="card">
          <h2>허용되지 않은 계정입니다</h2>
          <p>
            <strong>{status.email}</strong> 계정은 교사 화면에 들어갈 수 없습니다.
          </p>
          <p className="muted">교사로 등록된 Google 계정으로 다시 로그인해 주세요.</p>
          <div className="actions">
            <button type="button" className="button primary" onClick={logout}>
              로그아웃
            </button>
          </div>
        </section>
      );
    case "error":
    case "signed-out":
      return (
        <section className="card">
          <h2>교사 로그인</h2>
          <p className="muted">교사 화면은 등록된 Google 계정으로 로그인해야 들어갈 수 있습니다.</p>
          {status.kind === "error" ? (
            <p className="field-error" role="alert">
              {status.message}
            </p>
          ) : (
            status.message && (
              <p className="small muted" role="status">
                {status.message}
              </p>
            )
          )}
          <div className="actions">
            <button type="button" className="button primary" onClick={login}>
              Google 계정으로 로그인
            </button>
          </div>
        </section>
      );
  }
}
