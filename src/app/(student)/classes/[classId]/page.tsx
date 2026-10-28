import { redirect } from "next/navigation";

/** Classrooms are retired; courses are self-paced. Old class links land on the catalog. */
export default function LegacyClassDetailPage() {
  redirect("/courses");
}
