"use client";

import { useEffect, useState } from "react";
import { gradeQuiz } from "@/lib/quiz/grade";
import type { Answers, GradeResult, Quiz } from "@/lib/quiz/types";
import UploadStep from "./UploadStep";
import PreviewStep from "./PreviewStep";
import SolveStep from "./SolveStep";
import ResultStep from "./ResultStep";

type State =
  | { step: "upload" }
  | { step: "preview"; quiz: Quiz; fileName: string }
  | { step: "solve"; quiz: Quiz; fileName: string }
  | { step: "result"; quiz: Quiz; fileName: string; answers: Answers; result: GradeResult };

export default function QuizApp() {
  const [state, setState] = useState<State>({ step: "upload" });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [state.step]);

  switch (state.step) {
    case "upload":
      return <UploadStep onLoaded={(quiz, fileName) => setState({ step: "preview", quiz, fileName })} />;
    case "preview":
      return (
        <PreviewStep
          quiz={state.quiz}
          fileName={state.fileName}
          onStart={() => setState({ ...state, step: "solve" })}
          onReset={() => setState({ step: "upload" })}
        />
      );
    case "solve":
      return (
        <SolveStep
          quiz={state.quiz}
          onSubmit={(answers) =>
            setState({ ...state, step: "result", answers, result: gradeQuiz(state.quiz.questions, answers) })
          }
        />
      );
    case "result":
      return (
        <ResultStep
          quiz={state.quiz}
          result={state.result}
          onRetry={() => setState({ step: "solve", quiz: state.quiz, fileName: state.fileName })}
          onReset={() => setState({ step: "upload" })}
        />
      );
  }
}
