import type { Quiz } from "@/lib/quiz/types";

type Props = {
  quiz: Quiz;
  onStart: () => void;
  onBack: () => void;
};

export default function PreviewStep({ quiz, onStart, onBack }: Props) {
  return (
    <section className="card">
      <h2>{quiz.title}</h2>
      <p>
        모두 <strong>{quiz.questions.length}문항</strong>입니다. 모든 문항을 푼 뒤 한 번에 채점합니다.
      </p>

      <ol className="preview-list">
        {quiz.questions.map((q, i) => (
          <li key={i}>{q.question}</li>
        ))}
      </ol>

      <div className="actions">
        <button type="button" className="button secondary" onClick={onBack}>
          문제지 목록으로
        </button>
        <button type="button" className="button primary" onClick={onStart}>
          풀이 시작
        </button>
      </div>
    </section>
  );
}
