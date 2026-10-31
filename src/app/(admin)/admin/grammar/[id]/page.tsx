"use client";

import { useParams } from "next/navigation";
import GrammarTopicEditor from "@/components/admin/grammar/GrammarTopicEditor";

export default function AdminGrammarTopicPage() {
  const { id } = useParams<{ id: string }>();
  return <GrammarTopicEditor id={Number(id)} />;
}
