// 서버에서만 사용합니다(교사 PDF 출제 요청 처리). 테스트에서도 직접 불러 확인합니다.
import { extractText, getDocumentProxy } from "unpdf";
import { checkExtractedText, checkPdfFile, looksLikePdf, normalizeExtractedText } from "./limits.ts";

export type PdfTextResult = { ok: true; text: string; pages: number } | { ok: false; message: string };

/**
 * PDF에서 본문 글자를 읽습니다. 파일 크기·형식·암호·손상·스캔 여부·글자 수를 차례로 확인하고,
 * 하나라도 맞지 않으면 이유를 돌려줍니다. 본문을 자르거나 고치지 않습니다.
 */
export async function readPdfText(name: string, bytes: Uint8Array): Promise<PdfTextResult> {
  const fileCheck = checkPdfFile(name, bytes.byteLength);
  if (!fileCheck.ok) return fileCheck;
  if (!looksLikePdf(bytes)) return { ok: false, message: "PDF 파일이 아닙니다. 이름만 .pdf로 바뀐 파일일 수 있습니다." };

  let pdf;
  try {
    // pdf.js가 원본을 바꿀 수 있으므로 복사본을 넘깁니다.
    pdf = await getDocumentProxy(new Uint8Array(bytes));
  } catch (error) {
    const name = (error as { name?: string }).name ?? "";
    if (name === "PasswordException") {
      return { ok: false, message: "암호가 걸린 PDF입니다. 암호를 푼 PDF를 올려 주세요." };
    }
    return { ok: false, message: "PDF 파일을 열 수 없습니다. 파일이 손상되었을 수 있습니다." };
  }

  try {
    const { totalPages, text } = await extractText(pdf, { mergePages: true });
    const normalized = normalizeExtractedText(text);
    const textCheck = checkExtractedText(normalized);
    if (!textCheck.ok) return textCheck;
    return { ok: true, text: normalized, pages: totalPages };
  } catch {
    return { ok: false, message: "PDF에서 글자를 읽는 중 문제가 생겼습니다. 파일이 손상되었을 수 있습니다." };
  }
}
