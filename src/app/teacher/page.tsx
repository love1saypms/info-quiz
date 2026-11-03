import Link from "next/link";

// 교사 화면의 기본 구조입니다. 로그인·문제 등록·결과 저장은 다음 단계에서 연결합니다.
export default function TeacherPage() {
  return (
    <main className="container">
      <div className="top-bar">
        <h1 className="app-title">교사 화면</h1>
        <Link href="/" className="button secondary top-bar-button">
          첫 화면으로
        </Link>
      </div>

      <section className="card">
        <h2>문제 등록</h2>
        <p className="muted">문제를 등록하는 기능은 준비 중입니다.</p>
      </section>

      <section className="card">
        <h2>학생 풀이 결과</h2>
        <p className="muted">아직 풀이 결과를 저장하는 기능이 없어서 보여줄 결과가 없습니다.</p>
      </section>
    </main>
  );
}
