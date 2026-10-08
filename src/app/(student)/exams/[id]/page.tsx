import TakeQuizPage from "@/components/quiz/TakeQuizPage";

export default function ExamQuizRoute(props: { params: Promise<{ id: string }> }) {
  return <TakeQuizPage {...props} routeContext="exams" />;
}
