import { Suspense } from "react";

import { MistakeNotebook } from "@/components/mistakes/MistakeNotebook";

export default function MistakesPage() {
  return (
    <Suspense fallback={null}>
      <MistakeNotebook />
    </Suspense>
  );
}
