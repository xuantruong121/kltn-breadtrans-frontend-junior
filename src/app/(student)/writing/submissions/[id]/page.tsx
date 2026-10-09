import SubmissionAnalyticsPage from "@/components/submission/SubmissionReviewPage";

export default function WritingSubmissionRoute(props: { params: Promise<{ id: string }> }) {
  return <SubmissionAnalyticsPage {...props} />;
}
