import { createFileRoute } from "@tanstack/react-router";
import { LibraryChapterPage } from "@/components/library/LibraryChapterPage";

/** 本棚の本の章 (`/library/$bookId/$chapterId`)。本文・解説動画・朗読。本の画面の下には入れない。 */
export const Route = createFileRoute("/_app/library/$bookId_/$chapterId")({
  component: ChapterRoute,
});

function ChapterRoute() {
  const { bookId, chapterId } = Route.useParams();
  return (
    <LibraryChapterPage key={`${bookId}:${chapterId}`} bookId={bookId} chapterId={chapterId} />
  );
}
