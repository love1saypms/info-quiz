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
  questions: Question[];
};

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
