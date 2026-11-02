import type { Quiz } from "@/lib/quiz/types";

type Props = {
  quiz: Quiz;
  fileName: string;
  onStart: () => void;
  onReset: () => void;
};

export default function PreviewStep({ quiz, fileName, onStart, onReset }: Props) {
  return (
    <section className="card">
      <h2>문항 확인</h2>
      <p className="muted small">{fileName}</p>
      <p>
        모두 <strong>{quiz.questions.length}문항</strong>입니다. 모든 문항을 푼 뒤 한 번에 채점합니다.
      </p>

      <ol className="preview-list">
        {quiz.questions.map((q, i) => (
          <li key={i}>{q.question}</li>
        ))}
      </ol>

      <div className="actions">
        <button type="button" className="button secondary" onClick={onReset}>
          다른 파일 선택
        </button>
        <button type="button" className="button primary" onClick={onStart}>
          풀이 시작
        </button>
      </div>
    </section>
  );
}
