import type { PaperSummary } from "@/lib/quiz/types";

type Props = {
  papers: PaperSummary[] | null;
  error: string;
  loadingId: string | null;
  onSelect: (paper: PaperSummary) => void;
  onReload: () => void;
};

/** 학생: 교사가 공개한 문제지 목록 */
export default function PaperListStep({ papers, error, loadingId, onSelect, onReload }: Props) {
  return (
    <section className="card">
      <h2>문제지 고르기</h2>
      {error ? (
        <div className="notice error" role="alert">
          <p>{error}</p>
          <button type="button" className="button secondary top-bar-button" onClick={onReload}>
            다시 불러오기
          </button>
        </div>
      ) : papers === null ? (
        <p className="muted">문제지 목록을 불러오는 중…</p>
      ) : papers.length === 0 ? (
        <p className="muted">아직 준비된 문제지가 없습니다. 선생님께 문의해주세요.</p>
      ) : (
        <>
          <p className="muted">풀고 싶은 문제지를 누르세요.</p>
          <ul className="paper-list">
            {papers.map((paper) => (
              <li key={paper.id}>
                <button
                  type="button"
                  className="paper-item"
                  onClick={() => onSelect(paper)}
                  disabled={loadingId !== null}
                >
                  <span className="paper-title">{paper.title}</span>
                  <span className="small muted">
                    {loadingId === paper.id ? "불러오는 중…" : `${paper.questionCount}문항`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
