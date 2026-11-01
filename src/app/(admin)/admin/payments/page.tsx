import { redirect } from "next/navigation";

/** Old URL, kept for bookmarks. */
export default function LegacyPaymentsRedirect() {
  redirect("/admin/plan-purchases");
}
