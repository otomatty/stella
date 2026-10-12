import { createFileRoute } from "@tanstack/react-router";
import { LibraryBookPage } from "@/components/library/LibraryBookPage";

/** 個人の本棚の書籍 (`/library/$bookId`)。PDF の登録、本文の準備、章の一覧。 */
export const Route = createFileRoute("/_app/library/$bookId")({ component: BookRoute });

function BookRoute() {
  const { bookId } = Route.useParams();
  return <LibraryBookPage key={bookId} bookId={bookId} />;
}
