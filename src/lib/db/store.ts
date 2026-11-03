import "server-only";
import { createHash } from "node:crypto";
import { FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore";
import { contentKey, summarizeResults, titleKey, type ResultRow } from "@/lib/quiz/records";
import type { Answers, PaperSummary, Quiz } from "@/lib/quiz/types";

// Firestore에 문제지와 풀이 결과를 저장하고 읽습니다. 서버에서만 사용하며,
// 호출하기 전에 교사 권한 확인(verifyTeacherRequest)이나 학생 입력 확인을 먼저 거칩니다.
//
// papers/{자동 번호}            문제지 (정답·해설 포함 — 학생에게는 서버가 정답을 뺀 뒤 보냅니다)
// results/{문제지}_{이름 번호}   학생 이름별 최신 완료 결과 (같은 이름으로 다시 풀면 덮어씀)

const PAPERS = "papers";
const RESULTS = "results";

function hash(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

type PaperDoc = {
  title: string;
  titleKey: string;
  contentHash: string;
  questions: Quiz["questions"];
  questionCount: number;
  published: boolean;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type TeacherPaper = PaperSummary & { published: boolean; createdAt: number };

function toMillis(value: unknown): number {
  return value instanceof Timestamp ? value.toMillis() : 0;
}

export type AddPaperResult = { ok: true; id: string } | { ok: false; reason: "duplicate-title" | "duplicate-content" };

/**
 * 새 문제지를 저장합니다. 제목이나 내용이 같은 문제지가 있으면 저장하지 않습니다.
 * JSON 파일로 올린 문제지는 비공개로, AI로 만든 문제지는 교사가 저장을 누르면 바로 공개(published)합니다.
 */
export async function addPaper(
  db: Firestore,
  quiz: Quiz,
  teacherEmail: string,
  options: { published?: boolean; source?: "json" | "ai" } = {},
): Promise<AddPaperResult> {
  const tKey = titleKey(quiz.title);
  const cHash = hash(contentKey(quiz.questions));
  const papers = db.collection(PAPERS);
  const [sameTitle, sameContent] = await Promise.all([
    papers.where("titleKey", "==", tKey).limit(1).get(),
    papers.where("contentHash", "==", cHash).limit(1).get(),
  ]);
  if (!sameTitle.empty) return { ok: false, reason: "duplicate-title" };
  if (!sameContent.empty) return { ok: false, reason: "duplicate-content" };

  const ref = await papers.add({
    title: quiz.title,
    titleKey: tKey,
    contentHash: cHash,
    questions: quiz.questions,
    questionCount: quiz.questions.length,
    published: options.published === true,
    source: options.source ?? "json",
    createdBy: teacherEmail,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { ok: true, id: ref.id };
}

/** 교사용: 등록된 모든 문제지 (최근 등록 순) */
export async function listAllPapers(db: Firestore): Promise<TeacherPaper[]> {
  const snap = await db.collection(PAPERS).get();
  return snap.docs
    .map((doc) => {
      const d = doc.data() as PaperDoc;
      return {
        id: doc.id,
        title: d.title,
        questionCount: d.questionCount,
        published: d.published === true,
        createdAt: toMillis(d.createdAt),
      };
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** 교사용: 등록된 모든 문제지 제목 (AI가 겹치지 않는 제목을 만들도록 참고) */
export async function listPaperTitles(db: Firestore): Promise<string[]> {
  const snap = await db.collection(PAPERS).select("title").get();
  return snap.docs.map((doc) => String(doc.get("title") ?? "")).filter(Boolean);
}

/** 교사용: 공개 여부를 바꿉니다. 문제지가 없으면 false */
export async function setPublished(db: Firestore, id: string, published: boolean): Promise<boolean> {
  const ref = db.collection(PAPERS).doc(id);
  const snap = await ref.get();
  if (!snap.exists) return false;
  await ref.update({ published, updatedAt: FieldValue.serverTimestamp() });
  return true;
}

/** 학생용: 공개된 문제지 목록 (등록 순) */
export async function listPublishedPapers(db: Firestore): Promise<PaperSummary[]> {
  const snap = await db.collection(PAPERS).where("published", "==", true).get();
  return snap.docs
    .map((doc) => ({ doc, d: doc.data() as PaperDoc }))
    .sort((a, b) => toMillis(a.d.createdAt) - toMillis(b.d.createdAt))
    .map(({ doc, d }) => ({ id: doc.id, title: d.title, questionCount: d.questionCount }));
}

/** 공개된 문제지 하나 (정답 포함 — 서버 안에서만 씁니다). 비공개이거나 없으면 null */
export async function getPublishedPaper(db: Firestore, id: string): Promise<Quiz | null> {
  const snap = await db.collection(PAPERS).doc(id).get();
  if (!snap.exists) return null;
  const d = snap.data() as PaperDoc;
  if (d.published !== true) return null;
  return { title: d.title, questions: d.questions };
}

/** 문제지가 있는지 (교사 결과표용) */
export async function getPaperTitle(db: Firestore, id: string): Promise<string | null> {
  const snap = await db.collection(PAPERS).doc(id).get();
  return snap.exists ? (snap.data() as PaperDoc).title : null;
}

export type SaveResultInput = {
  paperId: string;
  paperTitle: string;
  studentName: string;
  nameKey: string;
  answers: Answers;
  score: number;
  correctCount: number;
  total: number;
  wrongQuestions: number[];
};

/** 학생의 최종 결과를 저장합니다. 같은 문제지·같은 이름이면 최신 결과로 덮어씁니다. */
export async function saveResult(db: Firestore, input: SaveResultInput): Promise<void> {
  const id = `${input.paperId}_${hash(input.nameKey).slice(0, 24)}`;
  await db
    .collection(RESULTS)
    .doc(id)
    .set({ ...input, submittedAt: FieldValue.serverTimestamp() });
}

/** 교사용: 한 문제지의 학생별 최신 결과와 평균 */
export async function getPaperResults(db: Firestore, paperId: string) {
  const snap = await db.collection(RESULTS).where("paperId", "==", paperId).get();
  const rows: ResultRow[] = snap.docs.map((doc) => {
    const d = doc.data();
    return {
      studentName: String(d.studentName ?? ""),
      nameKey: String(d.nameKey ?? ""),
      score: Number(d.score ?? 0),
      wrongQuestions: Array.isArray(d.wrongQuestions) ? (d.wrongQuestions as number[]) : [],
      submittedAt: toMillis(d.submittedAt),
    };
  });
  return summarizeResults(rows);
}
