import { QuizPage, quizMetadata, type QuizPageProps } from "@/components/games/quiz-page";

export async function generateMetadata({ params }: Pick<QuizPageProps, "params">) {
  return quizMetadata("district_quiz", params);
}

/** `/quiz/bangladesh`: which division is this district in? 20 questions a day. */
export default async function DistrictQuizPage(props: QuizPageProps) {
  return QuizPage({ game: "district_quiz", ...props });
}
