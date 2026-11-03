"use client";

import { useCallback, useEffect, useState } from "react";
import type { Answers, GradeResult, PaperSummary, PublicQuiz, Quiz } from "@/lib/quiz/types";
import PaperListStep from "./PaperListStep";
import PreviewStep from "./PreviewStep";
import SolveStep from "./SolveStep";
import ResultStep from "./ResultStep";

type State =
  | { step: "list" }
  | { step: "preview"; paperId: string; quiz: PublicQuiz }
  | { step: "solve"; paperId: string; quiz: PublicQuiz; attempt: number }
  | { step: "result"; paperId: string; quiz: PublicQuiz; fullQuiz: Quiz; result: GradeResult };

type Props = {
  /** 입장할 때 입력한 학생 이름. 결과를 저장할 때 함께 보냅니다. */
  studentName: string;
};

const NETWORK_ERROR = "서버에 연결하지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.";

async function getJson<T>(url: string, init?: RequestInit): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  try {
    const response = await fetch(url, { cache: "no-store", ...init });
    const data = (await response.json().catch(() => ({}))) as T & { message?: string };
    if (!response.ok) return { ok: false, message: data.message ?? "요청을 처리하지 못했습니다. 다시 시도해 주세요." };
    return { ok: true, data };
  } catch {
    return { ok: false, message: NETWORK_ERROR };
  }
}

/**
 * 학생 문제풀이: 공개 문제지 목록 → 문항 확인 → 풀이 → 채점·해설.
 * 푸는 동안에는 정답·해설이 없는 문제지만 받고, 모든 답을 제출하면 서버가 채점·저장한 뒤 결과를 돌려줍니다.
 */
export default function QuizApp({ studentName }: Props) {
  const [state, setState] = useState<State>({ step: "list" });
  const [papers, setPapers] = useState<PaperSummary[] | null>(null);
  const [listError, setListError] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const loadPapers = useCallback(async () => {
    setListError("");
    setPapers(null);
    const result = await getJson<{ papers: PaperSummary[] }>("/api/papers");
    if (result.ok) setPapers(result.data.papers);
    else setListError(result.message);
  }, []);

  useEffect(() => {
    if (state.step === "list") void loadPapers();
  }, [state.step, loadPapers]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [state.step]);

  async function selectPaper(paper: PaperSummary) {
    setLoadingId(paper.id);
    const result = await getJson<{ quiz: PublicQuiz }>(`/api/papers/${encodeURIComponent(paper.id)}`);
    setLoadingId(null);
    if (result.ok) setState({ step: "preview", paperId: paper.id, quiz: result.data.quiz });
    else setListError(result.message);
  }

  function startSolving(paperId: string, quiz: PublicQuiz) {
    setSubmitError("");
    setState((prev) => ({ step: "solve", paperId, quiz, attempt: prev.step === "solve" ? prev.attempt + 1 : Date.now() }));
  }

  async function submit(paperId: string, quiz: PublicQuiz, answers: Answers) {
    setSubmitting(true);
    setSubmitError("");
    const result = await getJson<{ quiz: Quiz; result: GradeResult }>(`/api/papers/${encodeURIComponent(paperId)}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: studentName, answers }),
    });
    setSubmitting(false);
    if (result.ok) {
      setState({ step: "result", paperId, quiz, fullQuiz: result.data.quiz, result: result.data.result });
    } else {
      setSubmitError(result.message);
    }
  }

  switch (state.step) {
    case "list":
      return (
        <PaperListStep papers={papers} error={listError} loadingId={loadingId} onSelect={selectPaper} onReload={loadPapers} />
      );
    case "preview":
      return (
        <PreviewStep
          quiz={state.quiz}
          onStart={() => startSolving(state.paperId, state.quiz)}
          onBack={() => setState({ step: "list" })}
        />
      );
    case "solve":
      return (
        <SolveStep
          key={state.attempt}
          quiz={state.quiz}
          submitting={submitting}
          submitError={submitError}
          onSubmit={(answers) => submit(state.paperId, state.quiz, answers)}
        />
      );
    case "result":
      return (
        <ResultStep
          quiz={state.fullQuiz}
          result={state.result}
          onRetry={() => startSolving(state.paperId, state.quiz)}
          onBack={() => setState({ step: "list" })}
        />
      );
  }
}
