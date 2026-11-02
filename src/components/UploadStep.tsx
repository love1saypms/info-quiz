"use client";

import { useId, useState } from "react";
import { MAX_FILE_BYTES, MAX_QUESTIONS, parseQuizFile } from "@/lib/quiz/parse";
import type { Quiz } from "@/lib/quiz/types";

type Props = {
  onLoaded: (quiz: Quiz, fileName: string) => void;
};

const MAX_SHOWN_ERRORS = 20;

export default function UploadStep({ onLoaded }: Props) {
  const inputId = useId();
  const [errors, setErrors] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setErrors([`파일이 너무 큽니다. 1MB 이하의 파일을 올려주세요. (현재 ${(file.size / 1024 / 1024).toFixed(1)}MB)`]);
      return;
    }
    let text: string;
    try {
      text = await file.text();
    } catch {
      setErrors(["파일을 읽지 못했습니다. 다시 선택해주세요."]);
      return;
    }
    const result = parseQuizFile(text);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors([]);
    onLoaded(result.quiz, file.name);
  }

  return (
    <section className="card">
      <h2>문제 파일 올리기</h2>
      <p className="muted">선생님께 받은 JSON 문제 파일을 선택하세요. (1MB 이하, 최대 {MAX_QUESTIONS}문항)</p>

      <label
        htmlFor={inputId}
        className={`dropzone${dragging ? " dragging" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFile(e.dataTransfer.files[0]);
        }}
      >
        <span className="dropzone-main">파일 선택</span>
        <span className="muted small">또는 여기로 파일을 끌어다 놓으세요</span>
      </label>
      <input
        id={inputId}
        type="file"
        accept=".json,application/json"
        className="visually-hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          // 같은 파일을 고친 뒤 다시 선택해도 onChange가 일어나도록 비웁니다.
          e.target.value = "";
        }}
      />

      {errors.length > 0 && (
        <div className="alert" role="alert">
          <strong>파일을 열 수 없습니다.</strong>
          <ul>
            {errors.slice(0, MAX_SHOWN_ERRORS).map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
          {errors.length > MAX_SHOWN_ERRORS && <p className="small">외 {errors.length - MAX_SHOWN_ERRORS}개 오류</p>}
        </div>
      )}

      <details className="format-help">
        <summary>문제 파일 형식 보기</summary>
        <pre>{`{
  "questions": [
    {
      "question": "문제 내용",
      "options": ["보기1", "보기2", "보기3", "보기4"],
      "correctAnswer": 2,
      "explanation": "해설"
    }
  ]
}`}</pre>
        <p className="small muted">correctAnswer는 정답 보기 번호(1~4)입니다. 1이면 첫 번째 보기가 정답입니다.</p>
        <a className="link" href="/sample-quiz.json" download="sample-quiz.json">
          예시 파일 내려받기
        </a>
      </details>
    </section>
  );
}
