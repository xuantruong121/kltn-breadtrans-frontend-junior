"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowLeft,
  BookOpen,
  Brain,
  Clock3,
  GraduationCap,
  Headphones,
  Layers3,
  Loader2,
  Mic2,
  PenLine,
  RefreshCw,
  Trophy,
  UserRound,
} from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";

type Row = Record<string, any>;
type Tracking = {
  learner: Row;
  overview: Row;
  courses: Row[];
  skills: {
    listening: Row;
    speaking: Row;
    reading: Row;
    writing: Row;
  };
  vocabulary: Row;
  grammar: Row;
  exams: Row;
  recentActivity: Row[];
  gamification: Row;
};

const dateTime = (value: string | null | undefined) => {
  if (!value) return "Chưa có dữ liệu";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Chưa có dữ liệu"
    : date.toLocaleString("vi-VN", { dateStyle: "medium", timeStyle: "short" });
};

const dateOnly = (value: string | null | undefined) => {
  if (!value) return "Chưa có dữ liệu";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Chưa có dữ liệu"
    : date.toLocaleDateString("vi-VN");
};

const score = (value: number | null | undefined) =>
  value === null || value === undefined ? "—" : `${Math.round(value * 10) / 10}`;

function EmptyState({ label = "Chưa có hoạt động học tập" }: { label?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center text-sm text-slate-500">
      {label}
    </div>
  );
}

function SectionCard({
  title,
  icon,
  children,
  action,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
          <span className="text-blue-600">{icon}</span>
          {title}
        </h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function SkillCard({
  title,
  icon,
  data,
  renderRow,
}: {
  title: string;
  icon: React.ReactNode;
  data: Row;
  renderRow: (item: Row) => React.ReactNode;
}) {
  return (
    <SectionCard title={title} icon={icon}>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-2xl font-black text-slate-900">{data.attemptCount ?? 0}</p>
          <p className="text-xs font-semibold text-slate-500">lượt ghi nhận</p>
        </div>
        {data.completedCount !== undefined ? (
          <p className="text-right text-xs font-semibold text-emerald-700">
            {data.completedCount} lượt hoàn thành
          </p>
        ) : null}
      </div>
      {data.recent?.length ? (
        <div className="space-y-2">
          {data.recent.slice(0, 4).map((item: Row) => renderRow(item))}
        </div>
      ) : (
        <EmptyState />
      )}
    </SectionCard>
  );
}

export default function AdminLearnerTrackingPage() {
  const params = useParams<{ id: string }>();
  const learnerId = Number(params.id);
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<Tracking>({
    queryKey: ["admin-learner-tracking", learnerId],
    enabled: Number.isInteger(learnerId) && learnerId > 0,
    queryFn: async () => {
      const response: any = await axiosClient.get(
        `/admin/users/${learnerId}/learning-tracking`,
      );
      return response?.data ?? response;
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={32} aria-label="Đang tải" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-extrabold text-slate-900">Không thể tải hồ sơ học viên</h1>
        <p className="mt-2 text-sm text-rose-600">
          {(error as any)?.response?.data?.message || "Học viên không tồn tại hoặc dữ liệu tạm thời chưa sẵn sàng."}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <RefreshCw size={16} /> Thử lại
        </button>
      </div>
    );
  }

  const learner = data.learner;
  const fullName = learner.profile?.fullName || learner.email;
  const courseProgress = data.overview.courseProgressPercent;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/admin/users"
            className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <ArrowLeft size={16} /> Quay lại danh sách người dùng
          </Link>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Hồ sơ học viên</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">{fullName}</h1>
          <p className="mt-1 text-sm text-slate-500">Tổng quan học tập từ dữ liệu server hiện có</p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm hover:border-blue-300 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60"
        >
          <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} /> Làm mới dữ liệu
        </button>
      </div>

      <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[auto_1fr] md:items-center">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-blue-50 text-blue-600">
          {learner.profile?.avatar ? (
            <img src={learner.profile.avatar} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <UserRound size={28} />
          )}
        </div>
        <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div><p className="text-xs font-semibold text-slate-500">Email</p><p className="mt-1 break-all font-bold text-slate-900">{learner.email}</p></div>
          <div><p className="text-xs font-semibold text-slate-500">Vai trò</p><p className="mt-1 font-bold text-slate-900">{learner.role === "STUDENT" ? "Học viên" : learner.role}</p></div>
          <div><p className="text-xs font-semibold text-slate-500">Ngày tham gia</p><p className="mt-1 font-bold text-slate-900">{dateOnly(learner.createdAt)}</p></div>
          <div><p className="text-xs font-semibold text-slate-500">Đăng nhập gần nhất</p><p className="mt-1 font-bold text-slate-900">{dateTime(learner.lastLoginAt)}</p></div>
        </div>
      </section>

      <SectionCard title="Tổng quan học tập" icon={<Activity size={18} />}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Tiến độ khóa học" value={courseProgress === null ? "Chưa có dữ liệu" : `${courseProgress}%`} detail={`${data.overview.completedCourseLessons}/${data.overview.totalCourseLessons} bài học`} />
          <Metric label="Hoạt động gần đây" value={data.overview.recentActivityCount} detail="bản ghi server" />
          <Metric label="Từ vựng đã học" value={data.overview.vocabularyStudied} detail={`${data.overview.vocabularyMastered} từ đã thuần thục`} />
          <Metric label="Luyện đề" value={data.overview.examAttempts} detail={`${data.overview.grammarAttempts} lượt ngữ pháp`} />
        </div>
      </SectionCard>

      <div className="grid gap-5 xl:grid-cols-2">
        <SkillCard title="Listening" icon={<Headphones size={18} />} data={data.skills.listening} renderRow={(item) => <ResultRow key={item.id} title={item.title} meta={`Điểm: ${score(item.score)}`} date={item.submittedAt} />} />
        <SkillCard title="Speaking" icon={<Mic2 size={18} />} data={data.skills.speaking} renderRow={(item) => <SpeakingRow key={item.id} item={item} />} />
        <SkillCard title="Reading" icon={<BookOpen size={18} />} data={data.skills.reading} renderRow={(item) => <ResultRow key={item.id} title={item.title} meta={`${item.topic ? `${item.topic} · ` : ""}Điểm: ${score(item.score)}`} date={item.submittedAt} />} />
        <SkillCard title="Writing" icon={<PenLine size={18} />} data={data.skills.writing} renderRow={(item) => <ResultRow key={item.id} title={item.title} meta={`Điểm: ${score(item.score)}`} date={item.submittedAt} detail={item.feedbackSummary} />} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <SectionCard title="Khóa học đang học" icon={<GraduationCap size={18} />}>
          {data.courses.length ? <div className="space-y-4">{data.courses.map((course: Row) => <CourseRow key={course.id} course={course} />)}</div> : <EmptyState label="Chưa có khóa học hoặc bài học đã ghi nhận" />}
        </SectionCard>
        <SectionCard title="Từ vựng" icon={<Layers3 size={18} />}>
          <div className="mb-4 grid grid-cols-3 gap-2 text-center"><Metric label="Đã học" value={data.vocabulary.studiedCount} /><Metric label="Thuần thục" value={data.vocabulary.masteredCount} /><Metric label="Đến hạn ôn" value={data.vocabulary.dueCount} /></div>
          {data.vocabulary.recent.length ? <div className="space-y-2">{data.vocabulary.recent.slice(0, 5).map((item: Row) => <ResultRow key={item.id} title={item.word} meta={item.isMastered ? "Đã thuần thục" : `${item.reviewCount} lượt ôn`} date={item.lastReviewedAt} />)}</div> : <EmptyState />}
        </SectionCard>
        <SectionCard title="Ngữ pháp" icon={<Brain size={18} />}>
          {data.grammar.recent.length ? <div className="space-y-2">{data.grammar.recent.slice(0, 6).map((item: Row) => <ResultRow key={item.id} title={item.topic} meta={`${item.level} · Điểm: ${score(item.score)}`} date={item.attemptedAt} />)}</div> : <EmptyState />}
        </SectionCard>
        <SectionCard title="Luyện đề / TOEIC" icon={<BookOpen size={18} />}>
          {data.exams.recent.length ? <div className="space-y-2">{data.exams.recent.slice(0, 6).map((item: Row) => <ResultRow key={item.id} title={item.exam} meta={`${item.mode} · ${item.status} · Điểm: ${score(item.totalScore)}`} date={item.submittedAt || item.attemptedAt} />)}</div> : <EmptyState />}
        </SectionCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.6fr]">
        <SectionCard title="Hoạt động học tập gần đây" icon={<Clock3 size={18} />}>
          {data.recentActivity.length ? <div className="space-y-3">{data.recentActivity.slice(0, 10).map((item: Row) => <div key={item.id} className="flex gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0"><div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500" /><div className="min-w-0"><p className="font-bold text-slate-900">{item.title}</p><p className="text-xs text-slate-500">{item.detail || item.type} · {dateTime(item.occurredAt)}{item.score !== null && item.score !== undefined ? ` · Điểm ${score(item.score)}` : ""}</p></div></div>)}</div> : <EmptyState />}
        </SectionCard>
        <SectionCard title="Gamification" icon={<Trophy size={18} />}>
          <div className="grid grid-cols-2 gap-3"><Metric label="Streak" value={data.gamification.streakCount} detail="ngày" /><Metric label="Bánh Mì" value={data.gamification.totalBanhRan} /><Metric label="EXP tổng" value={data.gamification.totalPoints} /><Metric label="Bậc" value={data.gamification.tier} /></div>
          <p className="mt-4 text-xs text-slate-500">Dữ liệu phần thưởng chỉ hiển thị như ngữ cảnh hỗ trợ cho tiến độ học.</p>
        </SectionCard>
      </div>
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: React.ReactNode; detail?: React.ReactNode }) {
  return <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 break-words text-lg font-black text-slate-900">{value}</p>{detail ? <p className="mt-0.5 text-xs text-slate-500">{detail}</p> : null}</div>;
}

function ResultRow({ title, meta, date, detail }: { title: string; meta: string; date: string | null; detail?: string | null }) {
  return <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2.5"><div className="flex items-start justify-between gap-3"><p className="min-w-0 truncate text-sm font-bold text-slate-800">{title}</p><span className="shrink-0 text-xs text-slate-500">{dateOnly(date)}</span></div><p className="mt-1 text-xs font-semibold text-slate-600">{meta}</p>{detail ? <p className="mt-1 line-clamp-2 text-xs text-slate-500">{detail}</p> : null}</div>;
}

function SpeakingRow({ item }: { item: Row }) {
  return <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2.5"><div className="flex items-start justify-between gap-3"><p className="min-w-0 truncate text-sm font-bold text-slate-800">{item.exerciseTitle}</p><span className="shrink-0 text-xs text-slate-500">{dateOnly(item.submittedAt)}</span></div><p className="mt-1 text-xs font-semibold text-slate-600">{item.status} · Overall {score(item.overallScore)}</p><p className="mt-1 text-xs text-slate-500">Accuracy {score(item.accuracy)} · Fluency {score(item.fluency)} · Completeness {score(item.completeness)} · PronScore {score(item.pronScore)}</p></div>;
}

function CourseRow({ course }: { course: Row }) {
  const hasLessons = course.totalLessons > 0;
  return <div><div className="flex items-center justify-between gap-3"><div><p className="font-bold text-slate-900">{course.title}</p><p className="text-xs text-slate-500">{course.level || "Chưa xác định cấp độ"}</p></div><span className="text-sm font-black text-blue-700">{hasLessons ? `${course.progressPercent}%` : "Chưa có dữ liệu"}</span></div>{hasLessons ? <><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${course.progressPercent ?? 0}%` }} /></div><p className="mt-1 text-xs text-slate-500">{course.completedLessons}/{course.totalLessons} bài học hoàn thành</p></> : <p className="mt-2 text-xs text-slate-500">Chưa có bài học đã xuất bản</p>}</div>;
}
