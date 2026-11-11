"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Reading mistakes now live in the mistake notebook with every other skill
 * (owner 2026-11-11). This address stays for old links.
 */
export default function ReadingMistakesPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/mistakes?skill=reading");
  }, [router]);
  return null;
}
