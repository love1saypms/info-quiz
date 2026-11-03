"use client";

import Link from "next/link";
import { useState } from "react";
import TeacherGate from "./TeacherGate";
import PaperManager from "./teacher/PaperManager";
import PaperUpload from "./teacher/PaperUpload";
import PdfGenerate from "./teacher/PdfGenerate";

// 교사 화면입니다. 허용된 교사로 로그인해야 내용이 보이고,
// 등록·공개 변경·결과 조회 요청은 서버에서도 교사 계정인지 다시 확인합니다.
export default function TeacherScreen() {
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <>
      <div className="top-bar">
        <h1 className="app-title">교사 화면</h1>
        <Link href="/" className="button secondary top-bar-button">
          첫 화면으로
        </Link>
      </div>

      <TeacherGate>
        {({ email, logout, getToken }) => (
          <>
            <section className="card login-info">
              <p className="small muted">
                <strong>{email}</strong> 계정으로 로그인했습니다.
              </p>
              <button type="button" className="button secondary top-bar-button" onClick={logout}>
                로그아웃
              </button>
            </section>

            <PdfGenerate getToken={getToken} onSaved={() => setReloadKey((k) => k + 1)} />
            <PaperUpload getToken={getToken} onSaved={() => setReloadKey((k) => k + 1)} />
            <PaperManager getToken={getToken} reloadKey={reloadKey} />
          </>
        )}
      </TeacherGate>
    </>
  );
}
