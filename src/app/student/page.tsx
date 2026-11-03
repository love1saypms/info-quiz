import StudentApp from "@/components/StudentApp";

// 학생 화면입니다. 문제지 목록은 교사가 공개한 것만 서버에서 받아옵니다.
export default function StudentPage() {
  return (
    <main className="container">
      <StudentApp />
    </main>
  );
}
