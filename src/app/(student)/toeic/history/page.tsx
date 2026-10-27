import { redirect } from "next/navigation";

/** The TOEIC history list now lives in the statistics page, with every attempt. */
export default function ToeicHistoryPage() {
  redirect("/toeic/stats");
}
