import { createFileRoute } from "@tanstack/react-router";
import { PublicLessonPage } from "@/components/public/PublicStart";

// ログインなしで読めるレッスン (Issue #41)。公開の印が無いものは「見つかりません」を出す。
export const Route = createFileRoute("/start/$lessonId")({
  component: StartLessonPage,
});

function StartLessonPage() {
  const { lessonId } = Route.useParams();
  return <PublicLessonPage lessonId={lessonId} />;
}
