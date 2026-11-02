import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseQuestionPaper } from "./parse.ts";
import type { PaperEntry } from "./types";

export const PAPERS_DIR = path.join(process.cwd(), "question-papers");

/**
 * 문제지 폴더의 JSON 파일을 파일 이름 순서대로 읽습니다. 서버에서만 사용합니다.
 * 홈 화면은 빌드할 때 한 번 읽어 고정 페이지로 만들므로(page.tsx의 force-static),
 * 배포 서버에 파일을 따로 실어 보낼 필요가 없어 turbopackIgnore로 파일 추적을 끕니다.
 */
export function loadQuestionPapers(dir: string = PAPERS_DIR): PaperEntry[] {
  let fileNames: string[];
  try {
    fileNames = readdirSync(/*turbopackIgnore: true*/ dir).filter((name) => name.toLowerCase().endsWith(".json"));
  } catch {
    return [];
  }
  fileNames.sort((a, b) => a.localeCompare(b, "ko"));

  return fileNames.map((fileName): PaperEntry => {
    let text: string;
    try {
      text = readFileSync(path.join(/*turbopackIgnore: true*/ dir, fileName), "utf8");
    } catch {
      return { fileName, ok: false, errors: ["문제지 파일을 열 수 없습니다."] };
    }
    const result = parseQuestionPaper(text);
    return result.ok ? { fileName, ok: true, quiz: result.quiz } : { fileName, ok: false, errors: result.errors };
  });
}
