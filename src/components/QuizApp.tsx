"use client";

import { useEffect, useState } from "react";
import { gradeQuiz } from "@/lib/quiz/grade";
import type { Answers, GradeResult, PaperEntry, Quiz } from "@/lib/quiz/types";
import PaperListStep from "./PaperListStep";
import PreviewStep from "./PreviewStep";
import SolveStep from "./SolveStep";
import ResultStep from "./ResultStep";

type State =
  | { step: "list" }
  | { step: "preview"; quiz: Quiz }
  | { step: "solve"; quiz: Quiz }
  | { step: "result"; quiz: Quiz; answers: Answers; result: GradeResult };

type Props = {
  papers: PaperEntry[];
};

export default function QuizApp({ papers }: Props) {
  const [state, setState] = useState<State>({ step: "list" });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [state.step]);

  switch (state.step) {
    case "list":
      return <PaperListStep papers={papers} onSelect={(quiz) => setState({ step: "preview", quiz })} />;
    case "preview":
      return (
        <PreviewStep
          quiz={state.quiz}
          onStart={() => setState({ step: "solve", quiz: state.quiz })}
          onBack={() => setState({ step: "list" })}
        />
      );
    case "solve":
      return (
        <SolveStep
          quiz={state.quiz}
          onSubmit={(answers) =>
            setState({ step: "result", quiz: state.quiz, answers, result: gradeQuiz(state.quiz.questions, answers) })
          }
          onHome={() => setState({ step: "list" })}
        />
      );
    case "result":
      return (
        <ResultStep
          quiz={state.quiz}
          result={state.result}
          onRetry={() => setState({ step: "solve", quiz: state.quiz })}
          onBack={() => setState({ step: "list" })}
          onHome={() => setState({ step: "list" })}
        />
      );
  }
}
