"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { MAX_NAME_LENGTH, checkStudentName } from "@/lib/quiz/records";
import QuizApp from "./QuizApp";

// 학생은 이름만 입력하고 들어갑니다. 이름은 최종 제출할 때 결과와 함께 저장되고,
// 화면에서는 기억하지 않으므로 새로고침하면 다시 입력합니다.
export default function StudentApp() {
  const [name, setName] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    // 서버가 저장할 때와 같은 규칙으로 이름을 정리합니다.
    const check = checkStudentName(draft);
    if (!check.ok) {
      setError(check.error);
      return;
    }
    setError("");
    setName(check.name);
  }

  return (
    <>
      <div className="top-bar">
        <h1 className="app-title">{name ? `${name} 학생` : "학생 입장"}</h1>
        <Link href="/" className="button secondary top-bar-button">
          첫 화면으로
        </Link>
      </div>

      {name ? (
        <QuizApp studentName={name} />
      ) : (
        <section className="card">
          <h2>이름을 입력하세요</h2>
          <form onSubmit={handleSubmit} noValidate>
            <label htmlFor="student-name" className="field-label">
              이름
            </label>
            <input
              id="student-name"
              className="text-input"
              type="text"
              value={draft}
              maxLength={MAX_NAME_LENGTH}
              autoComplete="off"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "student-name-error" : undefined}
              onChange={(e) => {
                setDraft(e.target.value);
                if (error) setError("");
              }}
            />
            {error && (
              <p id="student-name-error" className="field-error" role="alert">
                {error}
              </p>
            )}
            <div className="actions">
              <button type="submit" className="button primary">
                입장하기
              </button>
            </div>
          </form>
        </section>
      )}
    </>
  );
}
