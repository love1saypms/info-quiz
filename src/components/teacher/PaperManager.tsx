"use client";

import { useCallback, useEffect, useState } from "react";
import type { GetToken } from "../TeacherGate";
import ResultsTable from "./ResultsTable";
import { teacherFetch } from "./teacherApi";

type Paper = { id: string; title: string; questionCount: number; published: boolean; createdAt: number };

/** 교사: 등록한 문제지 목록, 공개/비공개 바꾸기, 문제지별 결과표 */
export default function PaperManager({ getToken, reloadKey }: { getToken: GetToken; reloadKey: number }) {
  const [papers, setPapers] = useState<Paper[] | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError("");
    const result = await teacherFetch<{ papers: Paper[] }>(getToken, "/api/teacher/papers");
    if (result.ok) setPapers(result.data.papers);
    else setError(result.message);
  }, [getToken]);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  async function togglePublished(paper: Paper) {
    setBusyId(paper.id);
    setRowError(null);
    const result = await teacherFetch<{ published: boolean }>(getToken, `/api/teacher/papers/${encodeURIComponent(paper.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ published: !paper.published }),
    });
    if (result.ok) {
      setPapers((prev) => prev?.map((p) => (p.id === paper.id ? { ...p, published: result.data.published } : p)) ?? prev);
    } else {
      setRowError({ id: paper.id, message: result.message });
    }
    setBusyId(null);
  }

  return (
    <section className="card">
      <h2>등록한 문제지와 학생 결과</h2>
      {error && (
        <div className="notice error" role="alert">
          <p>{error}</p>
          <button type="button" className="button secondary top-bar-button" onClick={load}>
            다시 불러오기
          </button>
        </div>
      )}
      {!error && papers === null && <p className="small muted">불러오는 중…</p>}
      {papers && papers.length === 0 && <p className="muted">아직 등록한 문제지가 없습니다. 위에서 문제지 파일을 올려 주세요.</p>}
      {papers && papers.length > 0 && (
        <ul className="paper-list">
          {papers.map((paper) => (
            <li key={paper.id} className="paper-item manage-item">
              <div className="manage-head">
                <div>
                  <span className="paper-title">{paper.title}</span>{" "}
                  <span className={`status-tag ${paper.published ? "on" : "off"}`}>{paper.published ? "공개 중" : "비공개"}</span>
                  <p className="small muted">{paper.questionCount}문항</p>
                </div>
              </div>
              <div className="manage-actions">
                <button
                  type="button"
                  className={`button ${paper.published ? "secondary" : "primary"} top-bar-button`}
                  onClick={() => togglePublished(paper)}
                  disabled={busyId === paper.id}
                >
                  {busyId === paper.id ? "바꾸는 중…" : paper.published ? "비공개로 바꾸기" : "공개하기"}
                </button>
                <button
                  type="button"
                  className="button secondary top-bar-button"
                  aria-expanded={openId === paper.id}
                  onClick={() => setOpenId(openId === paper.id ? null : paper.id)}
                >
                  {openId === paper.id ? "결과 닫기" : "결과 보기"}
                </button>
              </div>
              {rowError?.id === paper.id && (
                <p className="field-error" role="alert">
                  {rowError.message}
                </p>
              )}
              {openId === paper.id && <ResultsTable paperId={paper.id} getToken={getToken} />}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
