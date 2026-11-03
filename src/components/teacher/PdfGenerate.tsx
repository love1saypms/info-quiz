"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { checkPdfFile, MAX_TEXT_CHARS } from "@/lib/ai/limits";
import type { Quiz } from "@/lib/quiz/types";
import type { GetToken } from "../TeacherGate";
import { OPTION_MARKS } from "../optionMarks";
import { teacherFetch } from "./teacherApi";

type Props = {
  getToken: GetToken;
  onSaved: () => void;
};

type State =
  | { kind: "pick"; message?: string }
  | { kind: "ready"; file: File; error?: string; errors?: string[] }
  | { kind: "generating"; file: File }
  | { kind: "result"; file: File; quiz: Quiz; chars: number; error?: string }
  | { kind: "saving"; file: File; quiz: Quiz; chars: number };

/**
 * 교사: 글자 PDF 학습자료로 AI 문제지(제목 + 10문항)를 만듭니다.
 * 결과는 확인만 할 수 있고, [저장](바로 공개) 또는 [취소]만 고를 수 있습니다.
 */
export default function PdfGenerate({ getToken, onSaved }: Props) {
  const [state, setState] = useState<State>({ kind: "pick" });
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = state.kind === "generating" || state.kind === "saving";

  function backToPick(message?: string) {
    if (inputRef.current) inputRef.current.value = "";
    setState({ kind: "pick", message });
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const check = checkPdfFile(file.name, file.size);
    setState(check.ok ? { kind: "ready", file } : { kind: "ready", file, error: check.message });
  }

  async function generate() {
    if (state.kind !== "ready" || busy) return;
    const file = state.file;
    const check = checkPdfFile(file.name, file.size);
    if (!check.ok) return;
    setState({ kind: "generating", file });
    const form = new FormData();
    form.append("file", file);
    const result = await teacherFetch<{ quiz: Quiz; chars: number }>(getToken, "/api/teacher/generate", {
      method: "POST",
      body: form,
    });
    if (result.ok) setState({ kind: "result", file, quiz: result.data.quiz, chars: result.data.chars });
    else setState({ kind: "ready", file, error: result.message, errors: result.reason === "input" ? undefined : result.errors });
  }

  async function save() {
    if (state.kind !== "result") return;
    const { file, quiz, chars } = state;
    setState({ kind: "saving", file, quiz, chars });
    const result = await teacherFetch<{ id: string }>(getToken, "/api/teacher/papers", {
      method: "POST",
      body: JSON.stringify({ generated: quiz }),
    });
    if (result.ok) {
      backToPick(`"${quiz.title}" 문제지를 저장했고 학생 목록에 공개했습니다.`);
      onSaved();
    } else {
      setState({ kind: "result", file, quiz, chars, error: result.message });
    }
  }

  // 파일 이름·크기가 기준에 맞을 때만 생성 버튼을 누를 수 있습니다.
  const fileValid =
    (state.kind === "ready" || state.kind === "generating") && checkPdfFile(state.file.name, state.file.size).ok;

  return (
    <section className="card">
      <h2>PDF 학습자료로 AI 문제 만들기</h2>
      <p className="muted small">
        글자를 선택·복사할 수 있는 PDF만 됩니다(스캔·사진 PDF 안 됨). 파일 512KiB 이하, 본문{" "}
        {MAX_TEXT_CHARS.toLocaleString("ko-KR")}자 이하. AI가 제목과 4지선다 10문항을 만듭니다.
      </p>

      {(state.kind === "pick" || state.kind === "ready" || state.kind === "generating") && (
        <>
          <label htmlFor="pdf-file" className="field-label">
            PDF 파일
          </label>
          <input
            ref={inputRef}
            id="pdf-file"
            className="file-input"
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFile}
            disabled={busy}
          />
        </>
      )}

      {state.kind === "pick" && state.message && (
        <p className="notice success" role="status">
          {state.message}
        </p>
      )}

      {state.kind === "ready" && state.error && (
        <div className="notice error" role="alert">
          <p>{state.error}</p>
          {state.errors && (
            <ul className="small">
              {state.errors.slice(0, 5).map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {(state.kind === "ready" || state.kind === "generating") && (
        <div className="actions">
          <button type="button" className="button primary" onClick={generate} disabled={busy || !fileValid}>
            {state.kind === "generating" ? "AI가 문제를 만드는 중…" : state.error && fileValid ? "다시 시도" : "AI로 문제 만들기"}
          </button>
        </div>
      )}
      {state.kind === "generating" && (
        <p className="small muted center" role="status">
          보통 1분 안팎 걸립니다(최대 2분). 이 화면을 닫거나 새로고침하지 마세요.
        </p>
      )}

      {(state.kind === "result" || state.kind === "saving") && (
        <div className="upload-preview">
          <p className="notice">
            AI가 만든 내용입니다. 형식 검사는 통과했지만, <strong>문제·정답·해설이 PDF 내용과 맞는지는 직접 확인</strong>한
            뒤 저장하세요. 저장하면 바로 학생 목록에 공개됩니다.
          </p>
          <p className="paper-title">{state.quiz.title}</p>
          <p className="small muted">
            {state.file.name} · 본문 {state.chars.toLocaleString("ko-KR")}자 · {state.quiz.questions.length}문항
          </p>
          <ol className="generated-list">
            {state.quiz.questions.map((q, i) => (
              <li key={i} className="generated-item">
                <p className="question-text">{q.question}</p>
                <ol className="generated-options">
                  {q.options.map((option, j) => (
                    <li key={j} className={j + 1 === q.correctAnswer ? "is-answer" : undefined}>
                      <span className="option-mark">{OPTION_MARKS[j]}</span> {option}
                      {j + 1 === q.correctAnswer && <span className="tag answer">정답</span>}
                    </li>
                  ))}
                </ol>
                <p className="explanation small">
                  <strong>해설</strong> {q.explanation}
                </p>
              </li>
            ))}
          </ol>
          {state.kind === "result" && state.error && (
            <p className="notice error" role="alert">
              {state.error}
            </p>
          )}
          <div className="actions">
            <button type="button" className="button secondary" onClick={() => backToPick()} disabled={state.kind === "saving"}>
              취소
            </button>
            <button type="button" className="button primary" onClick={save} disabled={state.kind === "saving"}>
              {state.kind === "saving" ? "저장하는 중…" : "저장"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
