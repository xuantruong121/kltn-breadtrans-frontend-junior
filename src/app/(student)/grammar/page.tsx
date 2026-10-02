import { redirect } from "next/navigation";

export default function GrammarPage() {
  redirect("/practice/reading?tab=grammar");
}
