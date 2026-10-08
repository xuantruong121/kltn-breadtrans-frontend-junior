import { redirect } from "next/navigation";

export default function GrammarPage() {
  redirect("/reading?category=grammar");
}
