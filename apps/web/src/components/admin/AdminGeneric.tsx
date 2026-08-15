/**
 * 未実装ページのフォールバック表示。
 *
 * 管理画面の各ページは個別コンポーネント (AdminCoursesPage / AdminReportPage など) に
 * 実装済みで、 ここには未知の page キーが来たときの空表示だけが残っている。
 */

import { FileText } from "@/lib/icons";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";

export const GenericEmpty = ({ page }: { page: string }) => (
  <>
    <PageHeader title={page} />
    <Card className="text-center p-16 text-ink-3 text-sm">
      <div className="w-10 h-10 rounded-full bg-sunken grid place-items-center text-ink-3 mx-auto mb-3">
        <FileText size={20} />
      </div>
      このページは未実装です。
    </Card>
  </>
);
