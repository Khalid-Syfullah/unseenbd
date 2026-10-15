import { QuizPage, quizMetadata, type QuizPageProps } from "@/components/games/quiz-page";

export async function generateMetadata({ params }: Pick<QuizPageProps, "params">) {
  return quizMetadata("famous_quiz", params);
}

/** `/quiz/famous`: which district is this food or craft from? 20 questions a day. */
export default async function FamousQuizPage(props: QuizPageProps) {
  return QuizPage({ game: "famous_quiz", ...props });
}
