import { redirect } from "next/navigation";

/** Legacy enrollment workspace is retired: Pro entitlement controls course access. */
export default function LegacyEnrollmentRedirect() {
  redirect("/admin/plan-purchases");
}
