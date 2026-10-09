import SubmissionAnalyticsPage from "@/components/submission/SubmissionReviewPage";

export default function ExamSubmissionRoute(props: { params: Promise<{ id: string }> }) {
  return <SubmissionAnalyticsPage {...props} />;
}
