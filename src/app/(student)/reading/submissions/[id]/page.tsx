import SubmissionAnalyticsPage from "@/components/submission/SubmissionReviewPage";

export default function ReadingSubmissionRoute(props: { params: Promise<{ id: string }> }) {
  return <SubmissionAnalyticsPage {...props} />;
}
