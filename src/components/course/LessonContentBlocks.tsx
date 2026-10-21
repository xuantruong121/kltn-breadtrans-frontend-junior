import type { AudioExample } from "@/lib/course/sectionContent";

type ExampleLike = {
  label?: string;
  text?: string;
  translation?: string;
  explanation?: string;
};

/** Bilingual example card used by both the learner lesson runtime and the
 * Admin Live Preview, so Admin sees the same visual language the learner
 * does instead of a generic placeholder card. */
export function LessonExampleCard({
  index,
  example,
}: {
  index: number;
  example: ExampleLike;
}) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/90 to-white p-5 text-base shadow-xs dark:border-blue-900/60 dark:from-blue-950/40 dark:to-slate-900">
      <span className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-300">
        Ví dụ {String(index + 1).padStart(2, "0")}
      </span>
      <p className="mt-3 text-lg font-bold leading-relaxed text-slate-950 dark:text-white">
        {example.label ?? example.text ?? "Ví dụ"}
      </p>
      {example.translation && (
        <div className="mt-4 border-t border-blue-100 pt-3 dark:border-blue-900/60">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Nghĩa tiếng Việt
          </p>
          <p className="mt-1 leading-relaxed text-slate-700 dark:text-slate-200">
            {example.translation}
          </p>
        </div>
      )}
      {example.explanation && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-3 dark:border-amber-900/60 dark:bg-amber-950/30">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
            Vì sao dùng cấu trúc này?
          </p>
          <p className="mt-1 leading-relaxed text-amber-950 dark:text-amber-100">
            {example.explanation}
          </p>
        </div>
      )}
    </article>
  );
}

/** Audio/IPA block used by both the learner lesson runtime and the Admin
 * Live Preview. Plays via the existing <audio> element — no second player
 * implementation. */
export function LessonAudioExamplesBlock({
  sectionId,
  audioExamples,
}: {
  sectionId: string | number;
  audioExamples: AudioExample[];
}) {
  if (!audioExamples.length) return null;
  return (
    <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900/60 dark:bg-blue-950/30">
      <p className="font-bold text-blue-900 dark:text-blue-200">
        Nghe mẫu phát âm
      </p>
      <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        Nghe từ mẫu, nhìn IPA rồi lặp lại. Audio được lấy từ kho phát âm
        BreadTrans đã quản lý.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {audioExamples.map((item, index) => (
          <div
            key={`${sectionId}-audio-example-${index}`}
            className="rounded-xl border border-blue-100 bg-white p-3 dark:border-blue-900/60 dark:bg-slate-900"
          >
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-bold text-slate-900 dark:text-white">
                {item.term}
              </p>
              {item.ipa && (
                <span className="font-mono text-sm text-slate-500 dark:text-slate-400">
                  {item.ipa}
                </span>
              )}
            </div>
            {item.meaning && (
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {item.meaning}
              </p>
            )}
            {item.accent && (
              <p className="mt-1 text-xs text-slate-400">{item.accent}</p>
            )}
            {item.audioUrl && (
              <audio
                className="mt-2 w-full"
                controls
                preload="metadata"
                src={item.audioUrl}
                aria-label={`Nghe phát âm từ ${item.term}`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
