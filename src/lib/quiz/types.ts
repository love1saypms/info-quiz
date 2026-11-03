// 문제 파일과 채점 결과의 공통 타입.
// 2일차에 AI 생성 문제나 Firestore 저장을 붙일 때도 이 타입을 그대로 사용합니다.

/** 보기 번호. correctAnswer가 1이면 options[0]이 정답입니다. */
export type Choice = 1 | 2 | 3 | 4;

export type Question = {
  question: string;
  options: [string, string, string, string];
  correctAnswer: Choice;
  explanation: string;
};

export type Quiz = {
  title: string;
  questions: Question[];
};

/** 학생이 푸는 동안 받는 문항. 정답과 해설은 들어 있지 않습니다. */
export type PublicQuestion = Pick<Question, "question" | "options">;

/** 학생이 푸는 동안 받는 문제지. 정답과 해설은 채점한 뒤에만 받습니다. */
export type PublicQuiz = {
  title: string;
  questions: PublicQuestion[];
};

/** 학생 목록에 보이는 공개 문제지 한 개 */
export type PaperSummary = {
  id: string;
  title: string;
  questionCount: number;
};

/** question-papers 폴더의 문제지 파일 하나. 형식이 잘못된 파일도 목록에 안내하기 위해 함께 담습니다. */
export type PaperEntry =
  | { fileName: string; ok: true; quiz: Quiz }
  | { fileName: string; ok: false; errors: string[] };

/** 문항 순서대로 이용자가 고른 보기. 아직 고르지 않았으면 null. */
export type Answers = (Choice | null)[];

export type QuestionResult = {
  selected: Choice | null;
  correctAnswer: Choice;
  isCorrect: boolean;
};

export type GradeResult = {
  total: number;
  correctCount: number;
  /** 100점 만점, 소수 첫째 자리에서 반올림한 정수 */
  score: number;
  items: QuestionResult[];
};
