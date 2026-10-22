import { redirect } from "next/navigation";

/** Legacy course-payment URL retained only for old bookmarks. */
export default function LegacyPaymentsRedirect() {
  redirect("/admin/plan-purchases");
}
