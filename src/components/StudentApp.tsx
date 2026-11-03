"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import type { PaperEntry } from "@/lib/quiz/types";
import QuizApp from "./QuizApp";

type Props = {
  papers: PaperEntry[];
};

// 학생은 이름만 입력하고 들어갑니다. 이름은 저장하지 않으므로 새로고침하면 다시 입력합니다.
export default function StudentApp({ papers }: Props) {
  const [name, setName] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) {
      setError("이름을 입력해 주세요.");
      return;
    }
    setError("");
    setName(trimmed);
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
        <QuizApp papers={papers} />
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
              maxLength={20}
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
