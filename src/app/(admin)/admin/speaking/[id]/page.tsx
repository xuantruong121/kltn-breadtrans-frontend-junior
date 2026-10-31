"use client";

import { useParams } from "next/navigation";
import SpeakingSetEditor from "@/components/admin/speaking/SpeakingSetEditor";

export default function AdminSpeakingSetPage() {
  const { id } = useParams<{ id: string }>();
  return <SpeakingSetEditor id={id} />;
}
