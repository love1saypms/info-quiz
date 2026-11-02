import type { GradeResult, Quiz } from "@/lib/quiz/types";
import { OPTION_MARKS } from "./optionMarks";

type Props = {
  quiz: Quiz;
  result: GradeResult;
  onRetry: () => void;
  onBack: () => void;
};

export default function ResultStep({ quiz, result, onRetry, onBack }: Props) {
  return (
    <>
      <section className="card score-card">
        <h2>채점 결과</h2>
        <p className="muted small">{quiz.title}</p>
        <p className="score">
          <strong>{result.score}</strong>점 <span className="muted">/ 100점</span>
        </p>
        <p className="muted">
          {result.total}문항 중 {result.correctCount}문항 정답
        </p>
        <div className="actions">
          <button type="button" className="button secondary" onClick={onBack}>
            문제지 목록으로
          </button>
          <button type="button" className="button primary" onClick={onRetry}>
            같은 문제 다시 풀기
          </button>
        </div>
      </section>

      <ol className="result-list">
        {quiz.questions.map((q, i) => {
          const item = result.items[i];
          return (
            <li key={i} className={`card result-item ${item.isCorrect ? "correct" : "wrong"}`}>
              <div className="result-head">
                <span className="question-no">{i + 1}.</span>
                <span className={`badge ${item.isCorrect ? "correct" : "wrong"}`}>
                  {item.isCorrect ? "정답" : "오답"}
                </span>
              </div>
              <p className="question-text">{q.question}</p>
              <ul className="result-options">
                {q.options.map((option, j) => {
                  const choice = j + 1;
                  const isAnswer = choice === item.correctAnswer;
                  const isMine = choice === item.selected;
                  return (
                    <li key={j} className={`${isAnswer ? "is-answer" : ""} ${isMine && !isAnswer ? "is-wrong-pick" : ""}`}>
                      <span className="option-mark">{OPTION_MARKS[j]}</span>
                      <span className="option-text">{option}</span>
                      <span className="tags">
                        {isMine && <span className="tag mine">내 답</span>}
                        {isAnswer && <span className="tag answer">정답</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <div className="explanation">
                <strong>해설</strong>
                <p>{q.explanation}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}
