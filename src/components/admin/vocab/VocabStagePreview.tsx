"use client";

import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { VocabWord } from "@/lib/api/services/vocab.service";
import { FlashcardStage } from "@/modules/vocab/components/FlashcardStage";
import { QuizStage } from "@/modules/vocab/components/QuizStage";
import { TypingStage } from "@/modules/vocab/components/TypingStage";
import { SpeakingStage } from "@/modules/vocab/components/SpeakingStage";
import { playWordAudio } from "@/modules/vocab/utils/audio";
import { buildQuizOptions } from "@/modules/vocab/utils/quizOptions";
import { wordStageReadiness, type StageReadiness } from "./vocabCms";

type AdminWord = {
  id: number;
  word: string;
  meaning: string;
  pos?: string | null;
  ipaUs?: string | null;
  ipaUk?: string | null;
  audioUs?: string | null;
  audioUk?: string | null;
  exampleEn?: string | null;
  exampleVi?: string | null;
};

const asLearnerWord = (word: AdminWord): VocabWord => ({
  id: word.id,
  word: word.word,
  pos: word.pos || "noun",
  meaning: word.meaning,
  ipaUs: word.ipaUs ?? undefined,
  ipaUk: word.ipaUk ?? undefined,
  audioUs: word.audioUs ?? undefined,
  audioUk: word.audioUk ?? undefined,
  exampleEn: word.exampleEn ?? undefined,
  exampleVi: word.exampleVi ?? undefined,
});

/**
 * The four learner steps for one word, rendered by the learner's own
 * components so the admin sees exactly what a learner will get.
 */
export default function VocabStagePreview({
  word,
  words,
}: {
  word: AdminWord;
  words: AdminWord[];
}) {
  const stages = wordStageReadiness(word, words);
  const [stage, setStage] = useState<StageReadiness["stage"]>("FLASHCARD");
  const [flipped, setFlipped] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [hints, setHints] = useState(0);
  const [typingFeedback, setTypingFeedback] = useState<
    "CORRECT" | "INCORRECT" | null
  >(null);
  const learner = asLearnerWord(word);
  const options = useMemo(
    () => buildQuizOptions(word, words).options,
    [word, words],
  );
  const current = stages.find((s) => s.stage === stage)!;
  const play = (accent: "us" | "uk" = "us") =>
    void playWordAudio(
      word.word,
      (accent === "uk" ? word.audioUk : word.audioUs) ?? undefined,
      accent,
    );

  return (
    <div>
      <div
        role="tablist"
        aria-label="Bước học"
        className="grid grid-cols-4 gap-1 rounded-lg bg-slate-100 p-1"
      >
        {stages.map((s) => (
          <button
            key={s.stage}
            role="tab"
            type="button"
            aria-selected={stage === s.stage}
            onClick={() => setStage(s.stage)}
            className={`flex min-h-9 cursor-pointer items-center justify-center gap-1 rounded-md px-1 text-xs font-semibold transition-colors ${
              stage === s.stage
                ? "bg-white text-slate-950 shadow-sm"
                : "text-slate-600 hover:text-slate-950"
            }`}
          >
            <span
              aria-hidden="true"
              className={`size-1.5 rounded-full ${s.ready && !s.note ? "bg-emerald-500" : "bg-amber-500"}`}
            />
            {s.label}
          </button>
        ))}
      </div>
      {current.note && (
        <p className="mt-2 flex items-start gap-1.5 text-sm text-amber-800">
          <AlertCircle size={16} className="mt-0.5 flex-none" aria-hidden="true" />
          {current.note}
        </p>
      )}
      {!current.note && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-emerald-700">
          <CheckCircle2 size={16} aria-hidden="true" /> Bước này đủ nội dung.
        </p>
      )}
      {/* The learner components are laid out for the study room; a scaled
          frame keeps them readable in the 400px rail. */}
      <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-3">
        {stage === "FLASHCARD" && (
          <FlashcardStage
            word={learner}
            isFlipped={flipped}
            onFlip={() => setFlipped((value) => !value)}
            onPlayAudio={(accent) => play(accent)}
            onMarkMastered={() => undefined}
            onEscalate={() => setStage("QUIZ")}
          />
        )}
        {stage === "QUIZ" && (
          <QuizStage
            word={learner}
            options={options}
            selectedKey={selected}
            answered={selected !== null}
            onSelectOption={setSelected}
            onPlayAudio={(accent) => play(accent)}
          />
        )}
        {stage === "TYPING" && (
          <TypingStage
            word={learner}
            input={typed}
            hintCount={hints}
            feedback={typingFeedback}
            onInputChange={(value) => {
              setTyped(value);
              setTypingFeedback(null);
            }}
            onCheck={() =>
              setTypingFeedback(
                typed.trim().toLowerCase() === word.word.trim().toLowerCase()
                  ? "CORRECT"
                  : "INCORRECT",
              )
            }
            onRevealHint={() => setHints((n) => Math.min(n + 1, word.word.length))}
          />
        )}
        {stage === "SPEAKING" && (
          <SpeakingStage
            word={learner}
            isRecording={false}
            transcript=""
            score={null}
            feedback={null}
            onToggleRecord={() => undefined}
            onPlayAudio={(accent) => play(accent)}
            onRateSrs={() => undefined}
          />
        )}
      </div>
    </div>
  );
}
