import { Suspense } from "react";
import SpeakingSetEditor from "@/components/admin/speaking/SpeakingSetEditor";

/** The editor reads ?ai=1 with useSearchParams, which needs a Suspense boundary. */
export default function AdminSpeakingNewPage() {
  return (
    <Suspense fallback={null}>
      <SpeakingSetEditor />
    </Suspense>
  );
}
