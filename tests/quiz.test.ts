import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseQuizFile, MAX_QUESTIONS } from "../src/lib/quiz/parse.ts";
import { gradeQuiz } from "../src/lib/quiz/grade.ts";

const valid = {
  question: "1 + 1은?",
  options: ["1", "2", "3", "4"],
  correctAnswer: 2,
  explanation: "1 더하기 1은 2입니다.",
};

function parse(data: unknown) {
  return parseQuizFile(JSON.stringify(data));
}

test("올바른 파일은 통과하고 추가 필드는 무시한다", () => {
  const result = parse({ title: "무시됨", questions: [{ ...valid, extra: true }] });
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.quiz.questions[0], valid);
});

test("예시 파일이 검사를 통과한다", () => {
  const text = readFileSync(new URL("../public/sample-quiz.json", import.meta.url), "utf8");
  assert.equal(parseQuizFile(text).ok, true);
});

test("BOM이 붙은 파일도 읽는다", () => {
  assert.equal(parseQuizFile("\uFEFF" + JSON.stringify({ questions: [valid] })).ok, true);
});

test("잘못된 파일은 전체를 거부하고 문항 번호를 알려준다", () => {
  const cases: [unknown, RegExp][] = [
    [{ questions: [] }, /문제가 하나도 없습니다/],
    [{ items: [valid] }, /문제 목록을 찾을 수 없습니다/],
    [[valid], /문제 목록을 찾을 수 없습니다/],
    [{ questions: [valid, { ...valid, options: ["a", "b", "c"] }] }, /2번 문항: 보기는 4개가 있어야 하는데 3개입니다/],
    [{ questions: [{ ...valid, correctAnswer: 5 }] }, /1번 문항: 정답 번호는 1, 2, 3, 4 중 하나.*지금 적힌 값: 5/],
    [{ questions: [{ ...valid, correctAnswer: 0 }] }, /정답 번호/],
    [{ questions: [{ ...valid, correctAnswer: "2" }] }, /정답 번호/],
    [{ questions: [{ ...valid, correctAnswer: 1.5 }] }, /정답 번호/],
    [{ questions: [{ ...valid, question: "  " }] }, /문제 내용이 비어/],
    [{ questions: [{ ...valid, explanation: undefined }] }, /해설이 비어/],
    [{ questions: [{ ...valid, options: ["a", "", "c", "d"] }] }, /2번째 보기가 비어/],
    [{ questions: Array(MAX_QUESTIONS + 1).fill(valid) }, /최대 100개.*101개/],
  ];
  for (const [data, pattern] of cases) {
    const result = parse(data);
    assert.equal(result.ok, false, JSON.stringify(data).slice(0, 80));
    if (!result.ok) assert.match(result.errors.join("\n"), pattern);
  }
});

test("오류 메시지에 영어 항목명이나 기술용어를 쓰지 않는다", () => {
  const bad = { questions: [{ question: "", options: ["a"], correctAnswer: "x", explanation: "" }, 1] };
  const messages = [parse(bad), parse({}), parseQuizFile("{")]
    .flatMap((r) => (r.ok ? [] : r.errors))
    .join(" ");
  assert.doesNotMatch(messages, /question|options|correctAnswer|explanation|JSON|배열|객체|문자열/);
});

test("JSON 문법 오류를 알려준다", () => {
  const result = parseQuizFile("{ questions: ");
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.errors[0], /파일 내용을 읽을 수 없습니다/);
});

test("정답 수 ÷ 전체 문항 수 × 100을 반올림한 정수로 채점한다", () => {
  const qs = [valid, valid, valid].map((q) => ({ ...q, correctAnswer: 2 as const, options: [...q.options] as [string, string, string, string] }));
  assert.deepEqual(
    { ...gradeQuiz(qs, [2, 1, 3]), items: undefined },
    { total: 3, correctCount: 1, score: 33, items: undefined },
  );
  assert.equal(gradeQuiz(qs, [2, 2, 1]).score, 67);
  assert.equal(gradeQuiz(qs, [2, 2, 2]).score, 100);
  assert.equal(gradeQuiz(qs, [1, 1, 1]).score, 0);
  assert.deepEqual(gradeQuiz(qs, [2, 1, 3]).items[1], { selected: 1, correctAnswer: 2, isCorrect: false });
});
