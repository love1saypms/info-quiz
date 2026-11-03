"use client";

import { useCallback, useEffect, useState } from "react";
import type { GetToken } from "../TeacherGate";
import { teacherFetch } from "./teacherApi";

type Row = { studentName: string; score: number; wrongQuestions: number[]; submittedAt: number };
type Data = { average: number | null; rows: Row[] };

function formatTime(ms: number): string {
  if (!ms) return "-";
  return new Date(ms).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** 교사: 한 문제지의 학생별 최신 결과표와 평균 점수 */
export default function ResultsTable({ paperId, getToken }: { paperId: string; getToken: GetToken }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const result = await teacherFetch<Data>(getToken, `/api/teacher/papers/${encodeURIComponent(paperId)}/results`);
    if (result.ok) setData(result.data);
    else setError(result.message);
    setLoading(false);
  }, [getToken, paperId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !data) return <p className="small muted">결과를 불러오는 중…</p>;
  if (error)
    return (
      <div className="notice error" role="alert">
        <p>{error}</p>
        <button type="button" className="button secondary top-bar-button" onClick={load}>
          다시 불러오기
        </button>
      </div>
    );
  if (!data) return null;

  return (
    <div className="results-box">
      <div className="results-head">
        <p>
          평균 점수 <strong>{data.average === null ? "-" : `${data.average}점`}</strong>
          <span className="small muted"> (학생 {data.rows.length}명, 이름별 최신 결과 기준)</span>
        </p>
        <button type="button" className="button secondary top-bar-button" onClick={load} disabled={loading}>
          새로고침
        </button>
      </div>
      {data.rows.length === 0 ? (
        <p className="small muted">아직 이 문제지를 푼 학생이 없습니다.</p>
      ) : (
        <div className="table-wrap">
          <table className="results-table">
            <thead>
              <tr>
                <th scope="col">이름</th>
                <th scope="col">점수</th>
                <th scope="col">틀린 문제</th>
                <th scope="col">제출 시각</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.studentName}>
                  <td>{row.studentName}</td>
                  <td>{row.score}점</td>
                  <td>{row.wrongQuestions.length === 0 ? "없음" : row.wrongQuestions.map((n) => `${n}번`).join(", ")}</td>
                  <td className="small muted">{formatTime(row.submittedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
