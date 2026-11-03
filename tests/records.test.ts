import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checkAnswers,
  checkStudentName,
  contentKey,
  summarizeResults,
  titleKey,
  toPublicQuiz,
  wrongQuestionNumbers,
} from "../src/lib/quiz/records.ts";
import { gradeQuiz } from "../src/lib/quiz/grade.ts";
import type { Question } from "../src/lib/quiz/types.ts";

const q = (n: number, answer: 1 | 2 | 3 | 4 = 2): Question => ({
  question: `문제 ${n}`,
  options: ["가", "나", "다", "라"],
  correctAnswer: answer,
  explanation: `해설 ${n}`,
});

test("학생에게 보내는 문제지에는 정답과 해설이 없다", () => {
  const pub = toPublicQuiz({ title: "제목", questions: [q(1), q(2)] });
  assert.equal(pub.questions.length, 2);
  for (const item of pub.questions) {
    assert.deepEqual(Object.keys(item).sort(), ["options", "question"]);
  }
  assert.equal(JSON.stringify(pub).includes("해설"), false);
});

test("제목 중복은 대소문자·띄어쓰기 차이를 무시하고, 내용 중복은 문항이 모두 같을 때만", () => {
  assert.equal(titleKey("  중학교   정보과목 "), titleKey("중학교 정보과목"));
  assert.equal(titleKey("ABC"), titleKey("abc"));
  assert.equal(contentKey([q(1), q(2)]), contentKey([q(1), q(2)]));
  assert.notEqual(contentKey([q(1), q(2)]), contentKey([q(1), q(2, 3)]));
  assert.notEqual(contentKey([q(1), q(2)]), contentKey([q(2), q(1)]));
});

test("학생 이름: 빈칸은 막고, 앞뒤 공백을 지우고, 대소문자가 달라도 같은 이름으로 본다", () => {
  assert.deepEqual(checkStudentName("   "), { ok: false, error: "이름을 입력해 주세요." });
  assert.equal(checkStudentName(undefined).ok, false);
  assert.equal(checkStudentName("가".repeat(21)).ok, false);
  const a = checkStudentName("  Kim  Minsu ");
  const b = checkStudentName("kim minsu");
  assert.ok(a.ok && b.ok);
  assert.equal(a.name, "Kim Minsu");
  assert.equal(a.key, b.key);
});

test("제출한 답은 문항 수와 같고 모두 1~4여야 한다", () => {
  assert.deepEqual(checkAnswers([1, 4], 2), [1, 4]);
  assert.equal(checkAnswers([1], 2), null);
  assert.equal(checkAnswers([1, null], 2), null);
  assert.equal(checkAnswers([1, 5], 2), null);
  assert.equal(checkAnswers("1,2", 2), null);
});

test("틀린 문제 번호는 1부터 센다", () => {
  const result = gradeQuiz([q(1, 1), q(2, 2), q(3, 3)], [1, 1, 1]);
  assert.deepEqual(wrongQuestionNumbers(result), [2, 3]);
});

test("평균은 학생 이름별 최신 결과로 계산하고 소수 첫째 자리까지 반올림한다", () => {
  const rows = [
    { studentName: "김민수", nameKey: "김민수", score: 40, wrongQuestions: [1], submittedAt: 1 },
    { studentName: "김민수", nameKey: "김민수", score: 90, wrongQuestions: [], submittedAt: 2 },
    { studentName: "가영", nameKey: "가영", score: 75, wrongQuestions: [3], submittedAt: 1 },
    { studentName: "나래", nameKey: "나래", score: 70, wrongQuestions: [2], submittedAt: 1 },
  ];
  const summary = summarizeResults(rows);
  assert.deepEqual(
    summary.rows.map((r) => [r.studentName, r.score]),
    [
      ["가영", 75],
      ["김민수", 90],
      ["나래", 70],
    ],
  );
  assert.equal(summary.average, 78.3);
  assert.deepEqual(summarizeResults([]), { rows: [], average: null });
});
