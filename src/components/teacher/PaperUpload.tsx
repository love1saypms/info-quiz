"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { parseQuestionPaper } from "@/lib/quiz/parse";
import type { Quiz } from "@/lib/quiz/types";
import type { GetToken } from "../TeacherGate";
import { teacherFetch } from "./teacherApi";

type Props = {
  getToken: GetToken;
  onSaved: () => void;
};

type State =
  | { kind: "idle"; message?: string }
  | { kind: "invalid"; fileName: string; errors: string[] }
  | { kind: "preview"; fileName: string; text: string; quiz: Quiz; error?: string; errors?: string[] }
  | { kind: "saving"; fileName: string; text: string; quiz: Quiz };

/** 교사: 문제지 JSON 파일을 골라 제목·문항을 확인한 뒤 저장합니다. 저장한 문제지는 비공개 상태입니다. */
export default function PaperUpload({ getToken, onSaved }: Props) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);

  function reset(message?: string) {
    if (inputRef.current) inputRef.current.value = "";
    setState({ kind: "idle", message });
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".json")) {
      setState({ kind: "invalid", fileName: file.name, errors: ["문제지는 .json 파일만 올릴 수 있습니다."] });
      return;
    }
    const text = await file.text();
    const parsed = parseQuestionPaper(text);
    setState(
      parsed.ok
        ? { kind: "preview", fileName: file.name, text, quiz: parsed.quiz }
        : { kind: "invalid", fileName: file.name, errors: parsed.errors },
    );
  }

  async function save() {
    if (state.kind !== "preview") return;
    const { fileName, text, quiz } = state;
    setState({ kind: "saving", fileName, text, quiz });
    const result = await teacherFetch<{ id: string }>(getToken, "/api/teacher/papers", {
      method: "POST",
      body: JSON.stringify({ text }),
    });
    if (result.ok) {
      reset(`"${quiz.title}" 문제지를 저장했습니다. 아래 목록에서 [공개하기]를 누르면 학생에게 보입니다.`);
      onSaved();
    } else {
      setState({ kind: "preview", fileName, text, quiz, error: result.message, errors: result.errors });
    }
  }

  return (
    <section className="card">
      <h2>문제지 등록</h2>
      <p className="muted small">문제지 JSON 파일을 고르면 제목과 문항을 먼저 보여드립니다. 확인한 뒤 저장하세요.</p>

      <label htmlFor="paper-file" className="field-label">
        문제지 파일
      </label>
      <input
        ref={inputRef}
        id="paper-file"
        className="file-input"
        type="file"
        accept=".json,application/json"
        onChange={handleFile}
        disabled={state.kind === "saving"}
      />

      {state.kind === "idle" && state.message && (
        <p className="notice success" role="status">
          {state.message}
        </p>
      )}

      {state.kind === "invalid" && (
        <div className="notice error" role="alert">
          <p>
            <strong>{state.fileName}</strong> 파일은 등록할 수 없습니다. 아래 내용을 고친 뒤 다시 골라 주세요.
          </p>
          <ul className="small">
            {state.errors.slice(0, 10).map((error, i) => (
              <li key={i}>{error}</li>
            ))}
            {state.errors.length > 10 && <li>그 밖에 {state.errors.length - 10}개가 더 있습니다.</li>}
          </ul>
        </div>
      )}

      {(state.kind === "preview" || state.kind === "saving") && (
        <div className="upload-preview">
          <p className="paper-title">{state.quiz.title}</p>
          <p className="small muted">
            {state.fileName} · 모두 {state.quiz.questions.length}문항
          </p>
          <ol className="preview-list small">
            {state.quiz.questions.map((q, i) => (
              <li key={i}>{q.question}</li>
            ))}
          </ol>
          {state.kind === "preview" && state.error && (
            <div className="notice error" role="alert">
              <p>{state.error}</p>
              {state.errors && (
                <ul className="small">
                  {state.errors.slice(0, 10).map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className="actions">
            <button type="button" className="button secondary" onClick={() => reset()} disabled={state.kind === "saving"}>
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
