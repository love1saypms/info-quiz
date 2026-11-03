import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_PDF_BYTES,
  MAX_TEXT_CHARS,
  checkExtractedText,
  checkPdfFile,
  looksLikePdf,
  normalizeExtractedText,
} from "../src/lib/ai/limits.ts";
import { readPdfText } from "../src/lib/ai/pdfText.ts";
import { classifyHttpError, readCompletion } from "../src/lib/ai/azureResult.ts";
import { checkGeneratedPaper } from "../src/lib/quiz/generated.ts";

// ── 시험용 PDF 만들기: 글자 줄 목록(lines)을 한 쪽에 적은 가장 단순한 PDF ──
function makePdf(lines: string[]): Uint8Array {
  const esc = (s: string) => s.replace(/[\\()]/g, (c) => `\\${c}`);
  const content = lines.length
    ? `BT /F1 4 Tf 20 830 Td 6 TL ${lines.map((l) => `(${esc(l)}) Tj T*`).join(" ")} ET` // 작은 글씨로 한 쪽 안에 모두 들어가게
    : "0 0 1 rg 50 50 200 200 re f"; // 글자 없이 사각형만 (스캔·사진 PDF와 같은 경우)
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  out += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(out);
}

const okQuestion = (n: number) => ({
  question: `문제 ${n}`,
  options: ["가", "나", "다", "라"],
  correctAnswer: 2,
  explanation: `해설 ${n}`,
});
const tenQuestions = Array.from({ length: 10 }, (_, i) => okQuestion(i + 1));

test("PDF 파일 기준: .pdf만, 빈 파일 거부, 512KiB(524288바이트)까지 허용", () => {
  assert.equal(checkPdfFile("자료.pdf", 1).ok, true);
  assert.equal(checkPdfFile("자료.PDF", MAX_PDF_BYTES).ok, true);
  assert.equal(checkPdfFile("자료.pdf", MAX_PDF_BYTES + 1).ok, false);
  assert.equal(checkPdfFile("자료.pdf", 0).ok, false);
  assert.equal(checkPdfFile("자료.txt", 10).ok, false);
  assert.equal(MAX_PDF_BYTES, 524288);
});

test("본문 기준: 비어 있으면 거부, 12,000자까지 허용, 넘으면 자르지 않고 거부", () => {
  assert.equal(checkExtractedText("").ok, false);
  assert.equal(checkExtractedText("가".repeat(MAX_TEXT_CHARS)).ok, true);
  const over = checkExtractedText("가".repeat(MAX_TEXT_CHARS + 1));
  assert.equal(over.ok, false);
  assert.ok(!over.ok && over.message.includes("12,001자"));
  assert.equal(normalizeExtractedText("  가   나 \r\n\r\n\r\n\r\n다  "), "가 나\n\n다");
  assert.equal(looksLikePdf(new TextEncoder().encode("%PDF-1.7 ...")), true);
  assert.equal(looksLikePdf(new TextEncoder().encode("hello")), false);
});

test("글자 PDF는 본문을 읽는다", async () => {
  const result = await readPdfText("자료.pdf", makePdf(["Photosynthesis uses light energy.", "Plants make glucose."]));
  assert.ok(result.ok, JSON.stringify(result));
  assert.ok(result.text.includes("Photosynthesis uses light energy."));
  assert.equal(result.pages, 1);
});

test("글자 없는 PDF(스캔·사진)는 거부한다", async () => {
  const result = await readPdfText("스캔.pdf", makePdf([]));
  assert.equal(result.ok, false);
  assert.ok(!result.ok && result.message.includes("스캔"));
});

test("본문이 12,000자를 넘는 PDF는 AI에 보내지 않고 거부한다", async () => {
  const lines = Array.from({ length: 130 }, () => "x".repeat(99)); // 99자 x 130줄 + 줄바꿈 > 12,000자
  const pdf = makePdf(lines);
  assert.ok(pdf.byteLength < MAX_PDF_BYTES);
  const result = await readPdfText("긴자료.pdf", pdf);
  assert.equal(result.ok, false);
  assert.ok(!result.ok && result.message.includes("너무 깁니다"));
});

test("이름만 .pdf인 파일과 손상된 PDF는 거부한다", async () => {
  const fake = await readPdfText("가짜.pdf", new TextEncoder().encode("이건 PDF가 아닙니다"));
  assert.equal(fake.ok, false);
  const broken = await readPdfText("손상.pdf", new TextEncoder().encode("%PDF-1.4\n이후 내용이 깨짐"));
  assert.equal(broken.ok, false);
});

test("Azure 오류를 401·403·429·시간 초과·차단·기타로 구분한다", () => {
  assert.equal((classifyHttpError(401, "") as { reason: string }).reason, "unauthorized");
  assert.equal((classifyHttpError(403, "") as { reason: string }).reason, "forbidden");
  assert.equal((classifyHttpError(429, "") as { reason: string }).reason, "rate-limited");
  assert.equal((classifyHttpError(504, "") as { reason: string }).reason, "timeout");
  assert.equal((classifyHttpError(400, '{"error":{"code":"content_filter"}}') as { reason: string }).reason, "blocked");
  assert.equal((classifyHttpError(500, "") as { reason: string }).reason, "server-error");
});

test("Azure 응답에서 JSON을 꺼내고, 끊기거나 JSON이 아니면 형식 오류로 본다", () => {
  const body = (content: string | null, finish = "stop") => ({ choices: [{ finish_reason: finish, message: { content } }] });
  const good = readCompletion(body(JSON.stringify({ title: "제목", questions: [] })));
  assert.ok(good.ok);
  assert.equal((readCompletion(body("{ 반쯤", "length")) as { reason: string }).reason, "bad-response");
  assert.equal((readCompletion(body("JSON 아님")) as { reason: string }).reason, "bad-response");
  assert.equal((readCompletion(body(null)) as { reason: string }).reason, "bad-response");
  assert.equal((readCompletion({}) as { reason: string }).reason, "bad-response");
  assert.equal((readCompletion(body(null, "content_filter")) as { reason: string }).reason, "blocked");
});

test("AI 생성 결과: 정확히 10문항·보기 4개·정답 1~4·해설·제목이 있어야 통과", () => {
  assert.ok(checkGeneratedPaper({ title: "광합성", questions: tenQuestions }).ok);

  const nine = checkGeneratedPaper({ title: "광합성", questions: tenQuestions.slice(0, 9) });
  assert.ok(!nine.ok && nine.reason === "format" && nine.errors[0].includes("9개"));
  assert.equal(checkGeneratedPaper({ title: "광합성", questions: [...tenQuestions, okQuestion(11)] }).ok, false);
  assert.equal(checkGeneratedPaper({ title: "", questions: tenQuestions }).ok, false);

  const bad = (patch: object) => checkGeneratedPaper({ title: "광합성", questions: [{ ...okQuestion(1), ...patch }, ...tenQuestions.slice(1)] });
  assert.equal(bad({ options: ["가", "나", "다"] }).ok, false);
  assert.equal(bad({ correctAnswer: 5 }).ok, false);
  assert.equal(bad({ correctAnswer: 0 }).ok, false);
  assert.equal(bad({ explanation: "" }).ok, false);
  assert.equal(checkGeneratedPaper("JSON 아님").ok, false);
  assert.equal(checkGeneratedPaper(null).ok, false);
});

test("AI 생성 결과의 제목이 기존 문제지와 같으면(대소문자·띄어쓰기 무시) 중복으로 막는다", () => {
  const dup = checkGeneratedPaper({ title: " 중학교  정보과목 ", questions: tenQuestions }, ["중학교 정보과목"]);
  assert.ok(!dup.ok && dup.reason === "duplicate-title");
  assert.ok(checkGeneratedPaper({ title: "광합성", questions: tenQuestions }, ["중학교 정보과목"]).ok);
});
