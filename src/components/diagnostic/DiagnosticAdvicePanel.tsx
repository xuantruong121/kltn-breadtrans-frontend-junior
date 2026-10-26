import { ArrowRight, BookOpen, CircleAlert, Lock, Quote, Target, TrendingUp } from "lucide-react";
import type {
  DiagnosticAdvice,
  DiagnosticAdvicePriority,
  DiagnosticAdviceResource,
  DiagnosticSkillKey,
} from "@/lib/api/services/diagnostic.service";

const SKILL: Record<DiagnosticSkillKey, string> = {
  LISTENING: "Nghe",
  READING: "Đọc",
  SPEAKING: "Nói",
  WRITING: "Viết",
  LANGUAGE_USE: "Ngữ pháp & Từ vựng",
};

const KIND: Record<DiagnosticAdviceResource["kind"], string> = {
  LISTENING_QUIZ: "Luyện nghe",
  READING_QUIZ: "Luyện đọc",
  WRITING_QUIZ: "Luyện viết",
  SPEAKING_EXERCISE: "Luyện nói",
  COURSE: "Khoá học",
};

const UNASSESSED: Record<DiagnosticAdvice["unassessed"][number]["reason"], string> = {
  SKIPPED: "bạn đã bỏ qua phần này, nên không có căn cứ để nhận xét.",
  NOT_SUBMITTED: "chưa có bài làm để chấm.",
  PENDING_GRADING: "đang được chấm; nhận xét sẽ xuất hiện khi có kết quả.",
  GRADING_FAILED: "chưa chấm được do lỗi hệ thống chấm, không phải do bài làm. Bạn có thể bấm \"Chấm lại\" ở phần bài làm phía trên.",
};

function ResourceLink({ resource, note }: { resource: DiagnosticAdviceResource; note?: string }) {
  return (
    // Full page navigation on purpose: in a long browser session, a client-side
    // jump from this page into a practice room stayed on its loading screen
    // (root cause not identified; a fresh load of the same route works).
    <a
      href={resource.route}
      className="group flex min-h-11 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm transition-colors hover:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-500"
    >
      <span className="min-w-0">
        <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {KIND[resource.kind]}
          {note ? ` · ${note}` : ""}
        </span>
        <span className="block font-bold text-slate-900 dark:text-slate-100">{resource.title}</span>
        {resource.access === "LOCKED" && resource.requirement && (
          <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-300">
            <Lock size={12} strokeWidth={2.25} aria-hidden="true" />
            {resource.requirement}
          </span>
        )}
      </span>
      <ArrowRight size={16} strokeWidth={2.25} className="shrink-0 text-slate-400 group-hover:text-blue-600" aria-hidden="true" />
    </a>
  );
}

function PriorityCard({ item, label }: { item: DiagnosticAdvicePriority; label: string }) {
  return (
    <li className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700 sm:p-5">
      <p className="text-xs font-black uppercase tracking-wide text-amber-700 dark:text-amber-300">
        {label} · {SKILL[item.skill]}
      </p>
      <h3 className="mt-1 text-base font-black text-slate-900 dark:text-slate-100">{item.area}</h3>
      <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">Căn cứ: {item.evidence}</p>
      <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300">{item.why}</p>
      <p className="mt-2 text-sm leading-6 text-slate-800 dark:text-slate-200">
        <span className="font-bold">Cách luyện: </span>
        {item.action}
      </p>
      {item.graderFeedback.length > 0 && (
        <div className="mt-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-850">
          <p className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
            <Quote size={13} strokeWidth={2.25} aria-hidden="true" /> Nhận xét của bộ chấm về bài của bạn
          </p>
          <ul className="mt-1.5 space-y-1 text-sm leading-6 text-slate-700 dark:text-slate-300">
            {item.graderFeedback.map((text, i) => (
              <li key={i}>{text}</li>
            ))}
          </ul>
        </div>
      )}
      {item.resources.length > 0 ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {item.resources.map((r) => (
            <ResourceLink key={`${r.kind}-${r.id}`} resource={r} />
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Hiện chưa có bài luyện đang phát hành khớp với mục này.
        </p>
      )}
    </li>
  );
}

/** D1 result guidance: what went well, what to work on first, and where. */
export function DiagnosticAdvicePanel({ advice }: { advice: DiagnosticAdvice }) {
  const { profile } = advice;
  return (
    <section
      aria-labelledby="diagnostic-advice-title"
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:p-9"
    >
      <div className="flex items-center gap-2">
        <Target size={20} strokeWidth={2.25} className="text-blue-600 dark:text-blue-400" aria-hidden="true" />
        <h2 id="diagnostic-advice-title" className="text-lg font-black text-slate-900 dark:text-slate-100">
          Nên luyện gì tiếp theo
        </h2>
      </div>
      <p className="mt-1.5 text-sm leading-6 text-slate-600 dark:text-slate-400">
        Gợi ý dựa trên các câu bạn làm sai và phần chấm theo tiêu chí của chính bài này. Bài kiểm tra ngắn (10 câu mỗi
        kỹ năng Nghe, Đọc; 2 bài mỗi kỹ năng Nói, Viết) nên đây là định hướng luyện tập, không phải xếp trình độ.
      </p>

      {advice.mockGraderEvidence && (
        <p className="mt-4 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          <CircleAlert size={16} strokeWidth={2.25} className="mt-0.5 shrink-0" aria-hidden="true" />
          Bài Nói/Viết được chấm bằng bộ chấm thử nghiệm của môi trường kiểm thử; nhận xét Nói/Viết không phản ánh năng lực thật.
        </p>
      )}

      {profile.assessed.length >= 2 && (
        <p className="mt-4 text-sm leading-6 text-slate-700 dark:text-slate-300">
          {profile.balanced
            ? `Các kỹ năng đã chấm khá đồng đều (chênh lệch ${profile.spread} điểm, tương đương tối đa 1 câu trắc nghiệm), nên chưa thể nói kỹ năng nào yếu hơn hẳn.`
            : `Kỹ năng tốt nhất trong bài: ${profile.strongest.map((s) => SKILL[s]).join(", ")}. Kỹ năng nên ưu tiên: ${profile.weakest
                .map((s) => SKILL[s])
                .join(", ")}.`}
        </p>
      )}

      {advice.strengths.length > 0 && (
        <div className="mt-5">
          <h3 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            <TrendingUp size={14} strokeWidth={2.25} aria-hidden="true" /> Bạn làm tốt
          </h3>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {advice.strengths.map((s) => (
              <li key={s.areaKey} className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm dark:bg-emerald-950/30">
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {SKILL[s.skill]} · {s.area}
                </span>
                <span className="block text-xs text-slate-600 dark:text-slate-400">{s.evidence}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6">
        <h3 className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">Ưu tiên cải thiện</h3>
        {advice.priorities.length > 0 ? (
          <ol className="mt-2 space-y-3">
            {advice.priorities.map((p) => (
              <PriorityCard key={p.areaKey} item={p} label={`Ưu tiên ${p.rank}`} />
            ))}
          </ol>
        ) : (
          <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
            {advice.noWeaknessFound
              ? "Trong phạm vi bài kiểm tra này chưa thấy dạng câu hoặc tiêu chí nào cần ưu tiên. Bạn có thể chọn bài luyện ở mức khó hơn trong từng kỹ năng."
              : "Chưa đủ kỹ năng có điểm để đưa ra ưu tiên."}
          </p>
        )}
      </div>

      {advice.supplemental.length > 0 && (
        <div className="mt-6">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Bổ trợ (không tính vào điểm tổng)
          </h3>
          <ol className="mt-2 space-y-3">
            {advice.supplemental.map((p) => (
              <PriorityCard key={p.areaKey} item={p} label="Bổ trợ" />
            ))}
          </ol>
        </div>
      )}

      {advice.unassessed.length > 0 && (
        <div className="mt-6 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Chưa đánh giá được</h3>
          <ul className="mt-2 space-y-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
            {advice.unassessed.map((u) => (
              <li key={u.skill}>
                <span className="font-bold">{SKILL[u.skill]}: </span>
                {UNASSESSED[u.reason]}
                {u.generalPractice && (
                  <div className="mt-2 max-w-md">
                    <ResourceLink resource={u.generalPractice} note="luyện chung, không phải điểm yếu được chẩn đoán" />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-6 flex items-start gap-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
        <BookOpen size={14} strokeWidth={2.25} className="mt-0.5 shrink-0" aria-hidden="true" />
        Xem lại đáp án, giải thích và nhận xét từng bài ở phần bên dưới. Kết quả các bài luyện sau này được lưu trong lịch
        sử học tập để bạn theo dõi tiến bộ.
      </p>
    </section>
  );
}
