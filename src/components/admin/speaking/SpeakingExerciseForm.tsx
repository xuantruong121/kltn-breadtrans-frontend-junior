"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import axiosClient from "@/lib/api/axiosClient";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import ImageUploadField from "@/components/admin/ImageUploadField";
import RequiredMediaNotice from "@/components/admin/RequiredMediaNotice";
import { BTN_AI, BTN_PRIMARY, BTN_SECONDARY } from "../cmsButtons";
import {
  EXERCISE_LEVELS,
  TASK_TYPES,
  categoryLabel,
  difficultyLabel,
  unwrap,
  type SpeakingCategory,
  type SpeakingExercise,
  type SpeakingExerciseForm as ExerciseFormState,
  type SpeakingExerciseSuggestion,
  type SpeakingPracticeSet,
  type SpeakingStimulus,
  type SpeakingTaskType,
} from "./speakingCmsShared";

const FIELD =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

/**
 * One Speaking exercise, edited in place inside its row of the set editor
 * (or as "Câu luyện mới" under the list). Saves on its own.
 */
export default function SpeakingExerciseForm({
  set,
  exercise,
  categories,
  stimuli,
  defaultCategory,
  autoSuggest = false,
  onDone,
}: {
  set: SpeakingPracticeSet;
  exercise: SpeakingExercise | null;
  categories: SpeakingCategory[];
  stimuli: SpeakingStimulus[];
  defaultCategory: string;
  autoSuggest?: boolean;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const setCategory = set.category || defaultCategory;
  const [form, setForm] = useState<ExerciseFormState>(() => ({
    title: exercise?.title ?? "",
    targetText: exercise?.targetText ?? "",
    imageUrl: exercise?.imageUrl ?? "",
    category: exercise?.category || setCategory,
    difficulty: exercise?.difficulty || "BEGINNER",
    taskType: exercise?.taskType || "READ_ALOUD",
    stimulusId: exercise?.stimulusId ?? null,
    categoryOverride: Boolean(
      exercise?.categoryId && exercise.categoryId !== set.categoryId,
    ),
  }));
  const [suggestions, setSuggestions] = useState<SpeakingExerciseSuggestion[]>(
    [],
  );
  const [newStimulusTitle, setNewStimulusTitle] = useState("");
  const [newStimulusContent, setNewStimulusContent] = useState("");
  const exerciseCategories = categories.filter(
    (category) => category.isActive && category.allowExercise,
  );

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-speaking-set", set.id] });
    queryClient.invalidateQueries({
      queryKey: ["admin-speaking-validate", set.id],
    });
    queryClient.invalidateQueries({ queryKey: ["admin-speaking-sets"] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const dto = {
        title: form.title,
        targetText: form.targetText,
        category: form.categoryOverride ? form.category : null,
        difficulty: form.difficulty,
        taskType: form.taskType,
        stimulusId: form.stimulusId,
        imageUrl: form.imageUrl || null,
      };
      return exercise
        ? axiosClient.patch(
            `/admin/skill-content/speaking/${set.id}/exercises/${exercise.id}`,
            dto,
          )
        : axiosClient.post(
            `/admin/skill-content/speaking/${set.id}/exercises`,
            dto,
          );
    },
    onSuccess: () => {
      toast.success(exercise ? "Đã lưu câu luyện." : "Đã thêm câu luyện.");
      refresh();
      onDone();
    },
    onError: (err: any) => {
      toast.error(getApiErrorMessage(err, "Không thể lưu câu luyện nói."));
    },
  });

  const suggestMutation = useMutation({
    mutationFn: async () =>
      axiosClient.post("/admin/speaking/ai/suggest-exercises", {
        practiceSetTitle: set.title,
        practiceSetDescription: set.description || undefined,
        level: set.level || "BEGINNER",
        category: setCategory,
        currentTitle: form.title || undefined,
        currentTargetText: form.targetText || undefined,
        taskType: form.taskType,
        existingExerciseTitles: set.exercises.map((item) => item.title),
        count: 3,
      }),
    onSuccess: (result: any) => {
      const data = unwrap<any>(result);
      setSuggestions(data?.candidates || []);
    },
    onError: (err: any) => {
      toast.error(getApiErrorMessage(err, "Không thể lấy gợi ý AI lúc này."));
    },
  });

  // "Thêm câu luyện bằng AI" opens this form and asks for suggestions at once.
  const { mutate: requestSuggestions } = suggestMutation;
  useEffect(() => {
    if (autoSuggest) requestSuggestions();
  }, [autoSuggest, requestSuggestions]);

  const createStimulusMutation = useMutation({
    mutationFn: async () =>
      unwrap<SpeakingStimulus>(
        await axiosClient.post("/admin/skill-content/speaking/stimuli", {
          kind: "INFORMATION",
          title: newStimulusTitle.trim() || undefined,
          content: newStimulusContent.trim(),
        }),
      ),
    onSuccess: (stimulus) => {
      setForm((current) => ({ ...current, stimulusId: stimulus.id }));
      setNewStimulusTitle("");
      setNewStimulusContent("");
      queryClient.invalidateQueries({ queryKey: ["admin-speaking-stimuli"] });
      toast.success("Đã tạo thông tin dùng chung và chọn cho câu này.");
    },
    onError: (err: any) => {
      toast.error(getApiErrorMessage(err, "Không thể tạo thông tin dùng chung."));
    },
  });

  const submit = () => {
    if (!form.title.trim() || !form.targetText.trim()) {
      toast.error("Cần nhập tiêu đề và câu mẫu.");
      return;
    }
    if (form.taskType === "DESCRIBE_PICTURE" && !form.imageUrl.trim()) {
      toast.error("Bài mô tả tranh cần ảnh.");
      return;
    }
    if (form.taskType === "RESPOND_USING_INFORMATION" && !form.stimulusId) {
      toast.error("Chọn hoặc tạo thông tin dùng chung.");
      return;
    }
    saveMutation.mutate();
  };

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">
          {exercise ? "Sửa câu luyện" : "Câu luyện mới"}
        </p>
        <button
          type="button"
          onClick={() => suggestMutation.mutate()}
          disabled={suggestMutation.isPending}
          title="AI đọc bộ luyện và loại bài đang chọn rồi gợi ý 3 câu; bạn chọn câu muốn dùng."
          className={BTN_AI}
        >
          {suggestMutation.isPending && (
            <Loader2 size={14} className="animate-spin" />
          )}
          Gợi ý bằng AI
        </button>
      </div>

      {suggestions.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/40 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900">
              Gợi ý từ AI ({suggestions.length})
            </p>
            <button
              type="button"
              onClick={() => setSuggestions([])}
              className="cursor-pointer text-sm font-semibold text-slate-600 hover:text-slate-900"
            >
              Ẩn gợi ý
            </button>
          </div>
          <ul className="mt-2 space-y-2">
            {suggestions.map((candidate, index) => (
              <li
                key={`${candidate.title}-${index}`}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500">
                    {TASK_TYPES.find((t) => t.value === candidate.taskType)
                      ?.label ?? candidate.taskType}{" "}
                    · {difficultyLabel(candidate.difficulty)}
                  </p>
                  <p className="mt-0.5 font-semibold text-slate-900">
                    {candidate.title}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    {candidate.targetText}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setForm((current) => ({
                      ...current,
                      title: candidate.title,
                      targetText: candidate.targetText,
                      difficulty: candidate.difficulty,
                      taskType: candidate.taskType,
                    }));
                    setSuggestions([]);
                  }}
                  className={BTN_SECONDARY}
                >
                  Dùng gợi ý này
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-800">
          Loại bài
          <select
            value={form.taskType}
            onChange={(event) =>
              setForm({
                ...form,
                taskType: event.target.value as SpeakingTaskType,
                stimulusId:
                  event.target.value === "RESPOND_USING_INFORMATION"
                    ? form.stimulusId
                    : null,
              })
            }
            className={FIELD}
          >
            {TASK_TYPES.map((task) => (
              <option key={task.value} value={task.value}>
                {task.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-800">
          Cấp độ câu
          <select
            value={form.difficulty}
            onChange={(event) =>
              setForm({ ...form, difficulty: event.target.value })
            }
            className={FIELD}
          >
            {EXERCISE_LEVELS.map((level) => (
              <option key={level} value={level}>
                {difficultyLabel(level)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-800 md:col-span-2">
          Tiêu đề
          <input
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            placeholder="Ví dụ: Giới thiệu bản thân và nghề nghiệp"
            className={FIELD}
          />
        </label>
        <label className="text-sm font-medium text-slate-800 md:col-span-2">
          Câu mẫu tiếng Anh
          <textarea
            rows={3}
            value={form.targetText}
            onChange={(event) =>
              setForm({ ...form, targetText: event.target.value })
            }
            placeholder="Ví dụ: Hello, my name is Alex and I am a software engineer."
            className={`${FIELD} leading-relaxed`}
          />
          <span className="mt-1 block text-xs font-normal text-slate-500">
            Học viên nói câu này; hệ thống chấm phát âm, độ trôi chảy và độ đầy
            đủ.
          </span>
        </label>

        {form.taskType === "DESCRIBE_PICTURE" && (
          <div className="space-y-2 md:col-span-2">
            <ImageUploadField
              label="Ảnh để mô tả"
              value={form.imageUrl}
              onChange={(imageUrl) => setForm({ ...form, imageUrl })}
              helperText="PNG, JPG hoặc WEBP."
            />
            {!form.imageUrl.trim() && <RequiredMediaNotice />}
          </div>
        )}

        {form.taskType === "RESPOND_USING_INFORMATION" && (
          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 md:col-span-2">
            <label className="block text-sm font-medium text-slate-800">
              Thông tin dùng chung
              <select
                value={form.stimulusId ?? ""}
                onChange={(event) =>
                  setForm({
                    ...form,
                    stimulusId: event.target.value
                      ? Number(event.target.value)
                      : null,
                  })
                }
                className={FIELD}
              >
                <option value="">Chọn thông tin</option>
                {stimuli
                  .filter((stimulus) => stimulus.kind === "INFORMATION")
                  .map((stimulus) => (
                    <option key={stimulus.id} value={stimulus.id}>
                      {stimulus.title || `Thông tin #${stimulus.id}`}
                    </option>
                  ))}
              </select>
            </label>
            <p className="text-xs text-slate-500">
              Các câu hỏi về cùng một bảng thông tin chọn cùng một mục.
            </p>
            <details className="text-sm">
              <summary className="cursor-pointer font-semibold text-slate-700 hover:text-slate-900">
                Tạo thông tin mới
              </summary>
              <div className="mt-2 space-y-2">
                <input
                  value={newStimulusTitle}
                  onChange={(event) => setNewStimulusTitle(event.target.value)}
                  placeholder="Tiêu đề (ví dụ: Lịch hội thảo)"
                  className={FIELD}
                />
                <textarea
                  rows={3}
                  value={newStimulusContent}
                  onChange={(event) =>
                    setNewStimulusContent(event.target.value)
                  }
                  placeholder="Ví dụ: Registration is at 9:00..."
                  className={FIELD}
                />
                <button
                  type="button"
                  disabled={
                    createStimulusMutation.isPending ||
                    !newStimulusContent.trim()
                  }
                  onClick={() => createStimulusMutation.mutate()}
                  className={BTN_SECONDARY}
                >
                  {createStimulusMutation.isPending
                    ? "Đang tạo..."
                    : "Tạo và chọn"}
                </button>
              </div>
            </details>
          </div>
        )}

        <div className="text-sm font-medium text-slate-800 md:col-span-2">
          Chủ đề
          {form.categoryOverride ? (
            <select
              value={form.category}
              onChange={(event) =>
                setForm({ ...form, category: event.target.value })
              }
              className={FIELD}
            >
              {exerciseCategories.map((category) => (
                <option key={category.code} value={category.code}>
                  {category.name}
                </option>
              ))}
            </select>
          ) : (
            <p className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-normal text-slate-700">
              {categoryLabel(categories, setCategory)}
              <span className="text-slate-500"> · theo bộ luyện</span>
            </p>
          )}
          <label className="mt-2 flex items-center gap-2 font-normal text-slate-600">
            <input
              type="checkbox"
              checked={form.categoryOverride}
              onChange={(event) =>
                setForm({
                  ...form,
                  categoryOverride: event.target.checked,
                  category: event.target.checked
                    ? exerciseCategories[0]?.code || setCategory
                    : setCategory,
                })
              }
              className="size-4 rounded border-slate-300"
            />
            Dùng chủ đề riêng cho câu này
          </label>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={saveMutation.isPending}
          className={BTN_PRIMARY}
        >
          {saveMutation.isPending && (
            <Loader2 size={14} className="animate-spin" />
          )}
          {exercise ? "Lưu câu luyện" : "Thêm câu luyện"}
        </button>
        <button type="button" onClick={onDone} className={BTN_SECONDARY}>
          Hủy
        </button>
      </div>
    </div>
  );
}
