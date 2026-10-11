import { useEffect, useMemo, useState } from "react";
import {
  VARIANT_PURPOSE_LABELS,
  type VariantStockAlert,
  type VariantStockSummary,
  variantStockAlert,
} from "@stella/shared/tasks/variants";
import { AlertTriangle } from "@/lib/icons";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchVariantStock } from "@/lib/review-desk-api";
import { cn } from "@/lib/utils";

const LEVEL_ORDER: Record<VariantStockAlert["level"], number> = { danger: 0, warning: 1, ok: 2 };
const LEVEL_LABELS: Record<VariantStockAlert["level"], string> = {
  danger: "待ちあり",
  warning: "足りなくなる",
  ok: "足りている",
};

function LevelBadge({ level }: { level: VariantStockAlert["level"] }) {
  if (level === "ok") return <Badge variant="success">{LEVEL_LABELS.ok}</Badge>;
  return (
    <Badge variant={level}>
      <AlertTriangle size={10} />
      {LEVEL_LABELS[level]}
    </Badge>
  );
}

/**
 * コードの復習の類題の在庫 (#39、07 §7.3)。パターンごとに、教材にある類題の数・出題の記録がある
 * 受講者・まだ出していない類題がいちばん少ない人の残り・在庫切れで待っている受講者を出す。
 * 類題は教材リポジトリの `private/variants/` に人が書く (この画面からは足さない)。
 */
export function VariantStockPanel() {
  const [patterns, setPatterns] = useState<VariantStockSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shortOnly, setShortOnly] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetchVariantStock(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setPatterns(data);
      })
      .catch((err) => {
        if (!controller.signal.aborted)
          setError(err instanceof Error ? err.message : "在庫を読み込めませんでした");
      });
    return () => controller.abort();
  }, []);

  const rows = useMemo(() => {
    const all = (patterns ?? []).map((summary) => ({ summary, alert: variantStockAlert(summary) }));
    all.sort(
      (a, b) =>
        LEVEL_ORDER[a.alert.level] - LEVEL_ORDER[b.alert.level] ||
        b.summary.learners - a.summary.learners ||
        a.summary.pattern.localeCompare(b.summary.pattern),
    );
    return all;
  }, [patterns]);
  const short = rows.filter((r) => r.alert.level !== "ok");
  const shown = shortOnly ? short : rows;

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <Chip active={shortOnly} onClick={() => setShortOnly(true)}>
          足りないパターン ({short.length})
        </Chip>
        <Chip active={!shortOnly} onClick={() => setShortOnly(false)}>
          すべて ({rows.length})
        </Chip>
        <span className="text-[12px] text-ink-3 ml-2">
          類題は教材リポジトリの課題の private/variants/
          に書きます。足すと、在庫切れで待っている受講者には次に「今日の復習」を開いたときに出ます。
        </span>
      </div>
      {error ? <p className="text-sm text-destructive mb-3">{error}</p> : null}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>パターン</TableHead>
              <TableHead>在庫 (補習 / 確認用)</TableHead>
              <TableHead>受講者</TableHead>
              <TableHead>未見の残り (最少)</TableHead>
              <TableHead>在庫切れで待っている受講者</TableHead>
              <TableHead>見立て</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patterns === null ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-ink-3 py-10">
                  {error ? "-" : "読み込んでいます…"}
                </TableCell>
              </TableRow>
            ) : shown.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-ink-3 py-10">
                  {shortOnly ? "在庫が足りないパターンはありません" : "類題のパターンはありません"}
                </TableCell>
              </TableRow>
            ) : (
              shown.map(({ summary: s, alert }) => (
                <TableRow
                  key={s.pattern}
                  className={cn(alert.level === "danger" && "bg-danger-soft/40")}
                >
                  <TableCell>
                    <div className="font-medium">{s.practiceTitles[0] ?? s.pattern}</div>
                    <div className="text-[11.5px] text-ink-3">
                      {[s.pattern, ...s.stageTitles].join(" · ")}
                      {s.practiceTitles.length > 1 ? ` · 練習 ${s.practiceTitles.length} 問` : ""}
                    </div>
                  </TableCell>
                  <TableCell>
                    {s.stock.remedial} / {s.stock.check}
                  </TableCell>
                  <TableCell>{s.learners}</TableCell>
                  <TableCell>
                    {s.fewestUnseen ? `${s.fewestUnseen.remedial} / ${s.fewestUnseen.check}` : "-"}
                  </TableCell>
                  <TableCell>
                    {s.waiting.length === 0 ? (
                      <span className="text-ink-3">-</span>
                    ) : (
                      <ul className="space-y-0.5">
                        {s.waiting.map((w) => (
                          <li key={`${w.userId}-${w.dueOn}`} className="text-[12.5px]">
                            {w.name}
                            <span className="text-ink-3">
                              {" "}
                              · {VARIANT_PURPOSE_LABELS[w.purpose]} · {w.dueOn} から
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </TableCell>
                  <TableCell>
                    <LevelBadge level={alert.level} />
                    {alert.notes.length > 0 ? (
                      <ul className="mt-1 space-y-0.5 text-[11.5px] text-ink-3 max-w-[280px]">
                        {alert.notes.map((note) => (
                          <li key={note}>{note}</li>
                        ))}
                      </ul>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
