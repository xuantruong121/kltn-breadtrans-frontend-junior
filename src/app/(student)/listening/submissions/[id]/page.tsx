import SubmissionAnalyticsPage from "@/components/submission/SubmissionReviewPage";

export default function ListeningSubmissionRoute(props: { params: Promise<{ id: string }> }) {
  return <SubmissionAnalyticsPage {...props} />;
}
