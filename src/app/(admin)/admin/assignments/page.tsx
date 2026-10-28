import { redirect } from "next/navigation";

/** Classroom assignments are retired; old bookmarks land on course management. */
export default function LegacyAssignmentsRedirect() {
  redirect("/admin/courses");
}
