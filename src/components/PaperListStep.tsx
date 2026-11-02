import type { PaperEntry, Quiz } from "@/lib/quiz/types";

type Props = {
  papers: PaperEntry[];
  onSelect: (quiz: Quiz) => void;
};

export default function PaperListStep({ papers, onSelect }: Props) {
  return (
    <section className="card">
      <h2>문제지 고르기</h2>
      {papers.length === 0 ? (
        <p className="muted">아직 준비된 문제지가 없습니다. 선생님께 문의해주세요.</p>
      ) : (
        <>
          <p className="muted">풀고 싶은 문제지를 누르세요.</p>
          <ul className="paper-list">
            {papers.map((paper) =>
              paper.ok ? (
                <li key={paper.fileName}>
                  <button type="button" className="paper-item" onClick={() => onSelect(paper.quiz)}>
                    <span className="paper-title">{paper.quiz.title}</span>
                    <span className="small muted">{paper.quiz.questions.length}문항</span>
                  </button>
                </li>
              ) : (
                <li key={paper.fileName}>
                  <div className="paper-item broken" aria-disabled="true">
                    <span className="paper-title">{paper.fileName}</span>
                    <span className="small">이 문제지는 열 수 없습니다. 선생님께 알려주세요.</span>
                    <ul className="small">
                      {paper.errors.slice(0, 3).map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </li>
              ),
            )}
          </ul>
        </>
      )}
    </section>
  );
}
