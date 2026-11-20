import { redirect } from "next/navigation";

/** Duyệt câu dịch moved into the Writing page as a tab (owner 2026-11-19); old links still work. */
export default function AdminTranslationAnswersPage() {
  redirect("/admin/writing?tab=review");
}
