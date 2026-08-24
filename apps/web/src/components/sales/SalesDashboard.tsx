import { MessageCircle } from "@/lib/icons";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/** 営業ロール向けの簡易ダッシュボード — 面談対策への導線のみ。 */
export function SalesDashboard({ setPage }: { setPage: (page: string) => void }) {
  return (
    <>
      <PageHeader title="ダッシュボード" sub="面談対策の割当と準備状況を管理します" />
      <Card className="p-6 max-w-lg">
        <div className="text-[14px] font-semibold mb-2">面談対策</div>
        <p className="text-[12.5px] text-ink-3 mb-4 leading-relaxed">
          受講者ごとの案件種別の割当や準備状況の確認は、面談対策画面から行います。
        </p>
        <Button variant="primary" onClick={() => setPage("interview-prep")}>
          <MessageCircle size={14} />
          面談対策を開く
        </Button>
      </Card>
    </>
  );
}
