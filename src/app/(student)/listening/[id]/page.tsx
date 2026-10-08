import TakeQuizPage from "@/components/quiz/TakeQuizPage";

export default function ListeningQuizRoute(props: { params: Promise<{ id: string }> }) {
  return <TakeQuizPage {...props} routeContext="listening" />;
}
