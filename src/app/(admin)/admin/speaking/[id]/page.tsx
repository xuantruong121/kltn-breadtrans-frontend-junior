"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import SpeakingSetEditor from "@/components/admin/speaking/SpeakingSetEditor";

export default function AdminSpeakingSetPage() {
  const { id } = useParams<{ id: string }>();
  // The editor reads ?ai=1 with useSearchParams, which needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <SpeakingSetEditor id={id} />
    </Suspense>
  );
}
