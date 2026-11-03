import { createFileRoute } from "@tanstack/react-router";
import { LibraryBookPage } from "@/components/library/LibraryBookPage";

/** 本棚の本 (`/library/$bookId`)。表紙・紹介・章の一覧、更新版の読み込みと削除。 */
export const Route = createFileRoute("/_app/library/$bookId")({ component: BookRoute });

function BookRoute() {
  const { bookId } = Route.useParams();
  return <LibraryBookPage key={bookId} bookId={bookId} />;
}
