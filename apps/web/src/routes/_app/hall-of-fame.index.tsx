import { createFileRoute } from "@tanstack/react-router";
import { HallOfFameTop } from "@/components/hall-of-fame/HallOfFameTop";

/**
 * 殿堂のトップ (`/hall-of-fame`)。**全ロールが読める。**
 *
 * RoleGuard を貼らないのは、載っている人の物語は受講者にも講師にも営業にも同じように
 * 開いていてよいため (公開されていない掲載はサーバが返さない)。
 */
export const Route = createFileRoute("/_app/hall-of-fame/")({
  component: HallOfFameIndexPage,
});

function HallOfFameIndexPage() {
  return <HallOfFameTop />;
}
