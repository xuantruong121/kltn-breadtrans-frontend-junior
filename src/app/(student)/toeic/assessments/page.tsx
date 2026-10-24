import { redirect } from "next/navigation";

/**
 * TOEIC discovery lives in one place.
 *
 * `/exams` already lists every published TOEIC family (L&R, S&W, 4 Skills)
 * with filters, and it is the only TOEIC entry the navigation links to. This
 * route used to render a second catalog that showed S&W and 4 Skills only, so
 * the same canonical exam could appear in two different places while L&R was
 * discovered elsewhere. The URL is kept as a compatibility entry and now sends
 * the learner to the single catalog instead of being deleted.
 */
export default function ToeicAssessmentsPage() {
  redirect("/exams");
}
