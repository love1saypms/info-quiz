import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseQuestionPaper, MAX_QUESTIONS } from "../src/lib/quiz/parse.ts";
import { loadQuestionPapers } from "../src/lib/quiz/papers.ts";
import { gradeQuiz } from "../src/lib/quiz/grade.ts";

const valid = {
  question: "1 + 1은?",
  options: ["1", "2", "3", "4"],
  correctAnswer: 2,
  explanation: "1 더하기 1은 2입니다.",
};

/** 객체에는 제목을 기본으로 붙여서 검사합니다. */
function parse(data: unknown) {
  const withTitle = data && typeof data === "object" && !Array.isArray(data) ? { title: "제목", ...data } : data;
  return parseQuestionPaper(JSON.stringify(withTitle));
}

test("올바른 문제지는 통과하고 추가 필드는 무시한다", () => {
  const result = parse({ title: "  수학 1단원  ", questions: [{ ...valid, extra: true }], memo: "무시됨" });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.quiz.title, "수학 1단원");
    assert.deepEqual(result.quiz.questions[0], valid);
  }
});

test("question-papers 폴더의 문제지를 제목과 함께 읽는다", () => {
  const papers = loadQuestionPapers();
  assert.equal(papers.length, 1);
  const [paper] = papers;
  assert.equal(paper.fileName, "sample-questions.json");
  assert.equal(paper.ok, true);
  if (paper.ok) {
    const raw = JSON.parse(readFileSync(new URL("../question-papers/sample-questions.json", import.meta.url), "utf8"));
    assert.equal(paper.quiz.title, "중학교 정보과목");
    assert.equal(paper.quiz.questions.length, 10);
    assert.deepEqual(paper.quiz.questions, raw.questions);
  }
});

test("여러 문제지는 파일 이름 순서로 읽고, 잘못된 문제지도 목록에 남긴다", () => {
  // 점검이 끝나면 지우는 임시 폴더입니다. question-papers 폴더에는 아무것도 추가하지 않습니다.
  const dir = mkdtempSync(path.join(tmpdir(), "papers-"));
  try {
    writeFileSync(path.join(dir, "b.json"), JSON.stringify({ title: "두 번째", questions: [valid, valid] }));
    writeFileSync(path.join(dir, "a.json"), JSON.stringify({ title: "첫 번째", questions: [valid] }));
    writeFileSync(path.join(dir, "c.json"), JSON.stringify({ questions: [valid] }));
    writeFileSync(path.join(dir, "memo.txt"), "문제지가 아닌 파일");
    const papers = loadQuestionPapers(dir);
    assert.deepEqual(papers.map((p) => p.fileName), ["a.json", "b.json", "c.json"]);
    assert.deepEqual(papers.map((p) => (p.ok ? p.quiz.title : null)), ["첫 번째", "두 번째", null]);
    assert.equal(papers[1].ok && papers[1].quiz.questions.length, 2);
    assert.deepEqual(!papers[2].ok && papers[2].errors, ["문제지 제목이 없습니다."]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("문제지 폴더가 없으면 빈 목록을 돌려준다", () => {
  assert.deepEqual(loadQuestionPapers(path.join(tmpdir(), "no-such-papers-folder")), []);
});

test("BOM이 붙은 파일도 읽는다", () => {
  assert.equal(parseQuestionPaper("\uFEFF" + JSON.stringify({ title: "제목", questions: [valid] })).ok, true);
});

test("잘못된 문제지는 전체를 쓰지 않고 문항 번호를 알려준다", () => {
  const cases: [unknown, RegExp][] = [
    [{ title: "", questions: [valid] }, /문제지 제목이 없습니다/],
    [{ title: 3, questions: [valid] }, /문제지 제목이 없습니다/],
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
  const bad = { title: "", questions: [{ question: "", options: ["a"], correctAnswer: "x", explanation: "" }, 1] };
  const messages = [parse(bad), parse({}), parseQuestionPaper("{")]
    .flatMap((r) => (r.ok ? [] : r.errors))
    .join(" ");
  assert.doesNotMatch(messages, /title|question|options|correctAnswer|explanation|JSON|배열|객체|문자열/);
});

test("JSON 문법 오류를 알려준다", () => {
  const result = parseQuestionPaper("{ questions: ");
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
