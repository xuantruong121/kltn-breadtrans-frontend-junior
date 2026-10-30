"use client";

import { useParams } from "next/navigation";
import VocabDeckEditor from "@/components/admin/vocab/VocabDeckEditor";

export default function AdminVocabDeckPage() {
  const { id } = useParams<{ id: string }>();
  return <VocabDeckEditor id={Number(id)} />;
}
