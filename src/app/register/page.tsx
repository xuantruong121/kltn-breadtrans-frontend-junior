import { Suspense } from "react";
import RegisterFlow from "@/components/auth/RegisterFlow";

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-sky-50" />}>
      <RegisterFlow />
    </Suspense>
  );
}