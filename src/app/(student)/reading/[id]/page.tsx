import TakeQuizPage from "@/components/quiz/TakeQuizPage";

export default function ReadingExerciseRoute(props: { params: Promise<{ id: string }> }) {
  return <TakeQuizPage {...props} routeContext="reading" />;
}
