import Link from "next/link";

export default function Home() {
  return (
    <main className="container">
      <h1 className="app-title">문제풀이</h1>
      <section className="card">
        <h2>누구로 시작할까요?</h2>
        <p className="muted">알맞은 버튼을 누르세요.</p>
        <ul className="paper-list">
          <li>
            <Link href="/teacher" className="paper-item">
              <span className="paper-title">교사로 시작하기</span>
              <span className="small muted">문제를 등록하고 학생들의 풀이 결과를 확인합니다.</span>
            </Link>
          </li>
          <li>
            <Link href="/student" className="paper-item">
              <span className="paper-title">학생으로 시작하기</span>
              <span className="small muted">이름을 입력하고 문제를 풉니다.</span>
            </Link>
          </li>
        </ul>
      </section>
    </main>
  );
}
