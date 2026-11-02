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
  assert.equal(parseQuizFile("﻿" + JSON.stringify({ questions: [valid] })).ok, true);
});

test("잘못된 파일은 전체를 거부하고 문항 번호를 알려준다", () => {
  const cases: [unknown, RegExp][] = [
    [{ questions: [] }, /문항이 없습니다/],
    [{ items: [valid] }, /questions 배열/],
    [[valid], /questions 배열/],
    [{ questions: [valid, { ...valid, options: ["a", "b", "c"] }] }, /2번 문항: options의 보기는 4개.*현재 3개/],
    [{ questions: [{ ...valid, correctAnswer: 5 }] }, /1번 문항: correctAnswer/],
    [{ questions: [{ ...valid, correctAnswer: 0 }] }, /correctAnswer/],
    [{ questions: [{ ...valid, correctAnswer: "2" }] }, /correctAnswer/],
    [{ questions: [{ ...valid, correctAnswer: 1.5 }] }, /correctAnswer/],
    [{ questions: [{ ...valid, question: "  " }] }, /question/],
    [{ questions: [{ ...valid, explanation: undefined }] }, /explanation/],
    [{ questions: [{ ...valid, options: ["a", "", "c", "d"] }] }, /2번째 보기/],
    [{ questions: Array(MAX_QUESTIONS + 1).fill(valid) }, /최대 100개/],
  ];
  for (const [data, pattern] of cases) {
    const result = parse(data);
    assert.equal(result.ok, false, JSON.stringify(data).slice(0, 80));
    if (!result.ok) assert.match(result.errors.join("\n"), pattern);
  }
});

test("JSON 문법 오류를 알려준다", () => {
  const result = parseQuizFile("{ questions: ");
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.errors[0], /JSON 형식/);
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
