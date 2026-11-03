import StudentApp from "@/components/StudentApp";
import { loadQuestionPapers } from "@/lib/quiz/papers";

// 문제지 목록은 빌드할 때 question-papers 폴더에서 읽습니다. 문제지를 바꾸면 다시 빌드해야 합니다.
export const dynamic = "force-static";

export default function StudentPage() {
  const papers = loadQuestionPapers();
  return (
    <main className="container">
      <StudentApp papers={papers} />
    </main>
  );
}
