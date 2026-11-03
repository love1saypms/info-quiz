"use client";

import { useEffect, useState } from "react";
import type { Answers, Choice, PublicQuiz } from "@/lib/quiz/types";
import { OPTION_MARKS } from "./optionMarks";

type Props = {
  /** 정답·해설이 없는 문제지. 채점은 제출한 뒤 서버에서 합니다. */
  quiz: PublicQuiz;
  onSubmit: (answers: Answers) => void;
  /** 제출(채점·저장) 중이면 true */
  submitting?: boolean;
  /** 제출에 실패했을 때 보여줄 안내. 고른 답은 그대로 남아 다시 제출할 수 있습니다. */
  submitError?: string;
};

export default function SolveStep({ quiz, onSubmit, submitting = false, submitError = "" }: Props) {
  const total = quiz.questions.length;
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>(() => Array(total).fill(null));

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [index]);

  const question = quiz.questions[index];
  const selected = answers[index];
  const isLast = index === total - 1;
  const answeredCount = answers.filter((a) => a !== null).length;
  const allAnswered = answeredCount === total;

  function choose(choice: Choice) {
    setAnswers((prev) => prev.map((a, i) => (i === index ? choice : a)));
  }

  return (
    <section className="card">
      <div className="progress-header">
        <span className="small muted">
          {index + 1} / {total}
        </span>
        <span className="small muted">{answeredCount}문항 답함</span>
      </div>
      <div className="progress" aria-hidden="true">
        <div className="progress-bar" style={{ width: `${((index + 1) / total) * 100}%` }} />
      </div>

      <fieldset className="question">
        <legend className="question-text">
          <span className="question-no">{index + 1}.</span> {question.question}
        </legend>
        <div className="options">
          {question.options.map((option, i) => {
            const choice = (i + 1) as Choice;
            return (
              <label key={i} className={`option${selected === choice ? " selected" : ""}`}>
                <input
                  type="radio"
                  name={`q-${index}`}
                  checked={selected === choice}
                  onChange={() => choose(choice)}
                />
                <span className="option-mark">{OPTION_MARKS[i]}</span>
                <span className="option-text">{option}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="actions">
        <button
          type="button"
          className="button secondary"
          onClick={() => setIndex(index - 1)}
          disabled={index === 0 || submitting}
        >
          이전
        </button>
        {isLast ? (
          <button
            type="button"
            className="button primary"
            onClick={() => onSubmit(answers)}
            disabled={!allAnswered || submitting}
          >
            {submitting ? "채점하는 중…" : submitError ? "다시 시도" : "채점하기"}
          </button>
        ) : (
          <button
            type="button"
            className="button primary"
            onClick={() => setIndex(index + 1)}
            disabled={selected === null}
          >
            다음
          </button>
        )}
      </div>
      {submitError && (
        <p className="field-error center" role="alert">
          {submitError} 고른 답은 그대로 남아 있습니다.
        </p>
      )}
      {selected === null && <p className="small muted center">보기를 하나 고르면 다음으로 넘어갈 수 있습니다.</p>}
    </section>
  );
}
