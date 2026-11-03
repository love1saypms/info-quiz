// PDF로 문제를 만들 때 쓰는 입력 기준입니다. 화면과 서버가 같은 값을 씁니다.
// 교안의 교육용 기준이며 Vercel·Azure의 공식 한도가 아닙니다.

/** PDF 파일 최대 크기: 512KiB */
export const MAX_PDF_BYTES = 524_288;
/** 추출한 본문 최대 글자 수 */
export const MAX_TEXT_CHARS = 12_000;
/** AI가 만들 문항 수 */
export const GENERATED_QUESTION_COUNT = 10;

export type InputCheck = { ok: true } | { ok: false; message: string };

function kib(bytes: number): string {
  return `${Math.ceil(bytes / 1024).toLocaleString("ko-KR")}KB`;
}

/** 파일 이름·크기를 먼저 확인합니다. (내용을 읽기 전) */
export function checkPdfFile(name: string, size: number): InputCheck {
  if (!name.toLowerCase().endsWith(".pdf")) return { ok: false, message: "PDF 파일(.pdf)만 올릴 수 있습니다." };
  if (size <= 0) return { ok: false, message: "빈 파일입니다. 내용이 있는 PDF를 골라 주세요." };
  if (size > MAX_PDF_BYTES)
    return {
      ok: false,
      message: `PDF 파일이 너무 큽니다. ${kib(MAX_PDF_BYTES)}(512KiB) 이하만 올릴 수 있습니다. (이 파일: ${kib(size)})`,
    };
  return { ok: true };
}

/** 파일 맨 앞이 PDF 표시(%PDF-)로 시작하는지 확인합니다. 이름만 .pdf인 다른 파일을 걸러냅니다. */
export function looksLikePdf(bytes: Uint8Array): boolean {
  const head = String.fromCharCode(...bytes.slice(0, 1024));
  return head.includes("%PDF-");
}

/** 추출한 글자를 정리합니다. 줄바꿈과 띄어쓰기만 정돈하고 내용은 자르지 않습니다. */
export function normalizeExtractedText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** 글자 수 (한글·영문·숫자·문장부호·띄어쓰기를 모두 한 글자로 셉니다) */
export function countChars(text: string): number {
  return [...text].length;
}

/** 정리한 본문이 비어 있거나 기준보다 길면 AI에 보내지 않습니다. 몰래 자르지 않습니다. */
export function checkExtractedText(text: string): InputCheck {
  if (!text) {
    return {
      ok: false,
      message:
        "PDF에서 글자를 읽지 못했습니다. 스캔하거나 사진으로 만든 PDF는 지원하지 않습니다. 글자를 선택·복사할 수 있는 PDF를 올려 주세요.",
    };
  }
  const length = countChars(text);
  if (length > MAX_TEXT_CHARS) {
    return {
      ok: false,
      message: `PDF 본문이 너무 깁니다. 본문은 ${MAX_TEXT_CHARS.toLocaleString("ko-KR")}자 이하여야 합니다. (이 파일: ${length.toLocaleString("ko-KR")}자) 내용을 나눠서 올려 주세요.`,
    };
  }
  return { ok: true };
}
