"use client";

import { use, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import axiosClient from "@/lib/api/axiosClient";
import { toeicService } from "@/lib/api/services/toeic.service";
import { AssessmentSectionIntro } from "@/components/toeic/assessment/AssessmentSectionIntro";
import { SpeakingRoom, type SpeakingComponent } from "@/components/toeic/assessment/SpeakingRoom";
import { WritingRoom, type WritingComponent } from "@/components/toeic/assessment/WritingRoom";
import { roomStep, type RoomComponent } from "@/lib/toeic/assessmentRoom";
import { useCanonicalExamPath } from "@/lib/toeic/useCanonicalExamPath";
import { getApiErrorMessage } from "@/lib/utils/apiError";

type Attempt = {
  status: string;
  assessment: { title: string };
  components: Array<RoomComponent & Partial<SpeakingComponent> & Partial<WritingComponent>>;
};

/**
 * One exam, start to finish: the sections run in order, each opening from the
 * end of the one before. The learner never picks a section, and the result
 * page is the end of the road.
 */
export default function ToeicAssessmentAttemptPage({
  params,
}: {
  params: Promise<{ id: string; attemptId: string }>;
}) {
  const { id: rawId, attemptId: rawAttemptId } = use(params);
  const id = Number(rawId);
  const attemptId = Number(rawAttemptId);
  const router = useRouter();
  const client = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const queryKey = ["toeic-assessment-attempt", attemptId];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () =>
      (await axiosClient.get(`/toeic/assessments/attempts/${attemptId}`)) as unknown as Attempt,
    enabled: Number.isInteger(attemptId),
  });
  const refresh = () => client.invalidateQueries({ queryKey });
  const { path: canonicalDetailPath } = useCanonicalExamPath({ assessmentId: id });
  const backHref = canonicalDetailPath ?? `/toeic/assessments/${id}`;

  const startSection = useMutation({
    mutationFn: async (componentId: number) =>
      axiosClient.post(`/toeic/assessments/attempts/${attemptId}/components/${componentId}/start`),
    onSuccess: refresh,
    onError: (err: unknown) => setError(getApiErrorMessage(err, "Không mở được phần thi.")),
  });

  const step = data ? roomStep(data) : null;
  const leavingRef = useRef(false);
  useEffect(() => {
    if (!step || leavingRef.current) return;
    if (step.kind === "DONE") {
      leavingRef.current = true;
      void client.invalidateQueries({ queryKey: ["toeic-assessment", id] });
      router.replace(`/toeic/assessments/${id}/attempts/${attemptId}/result`);
    } else if (step.kind === "LISTENING_READING" && step.component.childAttemptId) {
      leavingRef.current = true;
      const childAttemptId = step.component.childAttemptId;
      const componentId = step.component.assessmentComponentId;
      void toeicService
        .beginAttempt(childAttemptId)
        .then(() =>
          router.replace(
            `/toeic/attempts/${childAttemptId}?parentAssessmentId=${id}&parentAttemptId=${attemptId}&parentComponentId=${componentId}`,
          ),
        )
        .catch((err: unknown) => {
          leavingRef.current = false;
          setError(getApiErrorMessage(err, "Không mở được phần Listening & Reading."));
        });
    } else if (step.kind === "CLOSE_LISTENING_READING") {
      leavingRef.current = true;
      void toeicService
        .completeAssessmentComponent(attemptId, step.component.assessmentComponentId)
        .then(refresh)
        .catch((err: unknown) => setError(getApiErrorMessage(err, "Chưa đóng được phần Listening & Reading.")))
        .finally(() => {
          leavingRef.current = false;
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per step
  }, [step?.kind, step && "component" in step ? step.component.status : null]);

  if (isLoading)
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" aria-label="Đang khôi phục bài thi" />
      </div>
    );
  if (!data || !step)
    return (
      <main className="mx-auto max-w-xl px-5 py-24 text-center text-slate-700 dark:text-slate-300">
        Không tìm thấy lượt làm bài.
      </main>
    );

  const sections = [...data.components].sort((a, b) => a.order - b.order);
  const title = data.assessment.title;

  if (step.kind === "INTRO")
    return (
      <AssessmentSectionIntro
        title={title}
        backHref={backHref}
        component={step.component}
        previous={step.previous}
        sections={sections}
        pending={startSection.isPending}
        error={error}
        onStart={() => {
          setError(null);
          startSection.mutate(step.component.assessmentComponentId);
        }}
      />
    );

  if (step.kind === "ROOM") {
    const shared = {
      key: step.component.assessmentComponentId,
      title,
      attemptId,
      sections,
      onSubmitted: () => void refresh(),
      onExit: () => router.push(backHref),
    };
    return step.component.kind === "SPEAKING" ? (
      <SpeakingRoom {...shared} component={step.component as SpeakingComponent} />
    ) : (
      <WritingRoom {...shared} component={step.component as WritingComponent} />
    );
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-5 text-center text-slate-700 dark:text-slate-300">
      {error ? <p role="alert">{error}</p> : <Loader2 className="animate-spin text-blue-600" aria-label="Đang chuyển phần thi" />}
    </main>
  );
}
