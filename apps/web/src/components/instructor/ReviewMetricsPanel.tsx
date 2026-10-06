import { useEffect, useState, type ReactNode } from "react";
import {
  type EscalatedMetric,
  REVIEW_METRIC_ALERTS,
  type ReviewMetrics,
} from "@stella/shared/review/review-desk";
import { AlertTriangle } from "@/lib/icons";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchReviewMetrics } from "@/lib/review-desk-api";
import { cn } from "@/lib/utils";

const PERIODS = [30, 90, 365] as const;

const percent = (rate: number | null) => (rate === null ? "-" : `${Math.round(rate * 1000) / 10}%`);
const limit = (value: number) => `${Math.round(value * 100)}%`;

function Rate({ rate, exceeds }: { rate: number | null; exceeds: boolean }) {
  return exceeds ? (
    <Badge variant="danger">
      <AlertTriangle size={10} />
      {percent(rate)}
    </Badge>
  ) : (
    <span>{percent(rate)}</span>
  );
}

function Section({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <Card className="overflow-hidden mb-4">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <p className="px-4 pb-2 text-[12px] text-ink-3">{note}</p>
      {children}
    </Card>
  );
}

function Empty({ cols }: { cols: number }) {
  return (
    <TableRow>
      <TableCell colSpan={cols} className="text-center text-ink-3 py-6">
        この期間の記録はありません
      </TableCell>
    </TableRow>
  );
}

function EscalatedTable({ rows, keyLabel }: { rows: EscalatedMetric[]; keyLabel: string }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{keyLabel}</TableHead>
          <TableHead>人が判定</TableHead>
          <TableHead>そのまま合格</TableHead>
          <TableHead>割合</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <Empty cols={4} />
        ) : (
          rows.map((r) => (
            <TableRow key={r.key} className={cn(r.exceeds && "bg-danger-soft/40")}>
              <TableCell>{r.label}</TableCell>
              <TableCell>{r.decided}</TableCell>
              <TableCell>{r.passedAsIs}</TableCell>
              <TableCell>
                <Rate rate={r.rate} exceeds={r.exceeds} />
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

/**
 * しきい値の月次見直しに使う数字 (#34、07 §6.3)。境目を超えた行を目立たせるだけで、
 * しきい値は自動では変えない。
 */
export function ReviewMetricsPanel() {
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);
  const [metrics, setMetrics] = useState<ReviewMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    fetchReviewMetrics(days, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setMetrics(data);
      })
      .catch((err) => {
        if (!controller.signal.aborted)
          setError(err instanceof Error ? err.message : "数字を読み込めませんでした");
      });
    return () => controller.abort();
  }, [days]);

  return (
    <>
      <div className="flex items-center gap-2 mb-3 text-[12.5px]">
        <label htmlFor="metrics-days" className="text-ink-3">
          期間
        </label>
        <select
          id="metrics-days"
          value={days}
          onChange={(e) => setDays(Number(e.target.value) as (typeof PERIODS)[number])}
          className="h-8 rounded-sm border border-input bg-card px-2"
        >
          {PERIODS.map((d) => (
            <option key={d} value={d}>
              直近 {d} 日
            </option>
          ))}
        </select>
        <span className="text-ink-3">
          境目を超えた行に印を付けます。しきい値は自動では変えません (月 1 回、人が見直します)。
        </span>
      </div>
      {error ? <p className="text-sm text-destructive mb-3">{error}</p> : null}
      {metrics === null ? (
        <p className="text-ink-3 text-[12.5px]">読み込んでいます…</p>
      ) : (
        <>
          <Section
            title="練習の「中」で AI が合格にした提出のうち、人が覆した割合"
            note={`講座ごと。割合は人が確認した提出に対する覆した提出の割合。${limit(REVIEW_METRIC_ALERTS.practiceMediumOverturned)} を超えたら、その講座の練習も「中」から人に回すことを検討します。`}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>講座</TableHead>
                  <TableHead>AI 合格 (中)</TableHead>
                  <TableHead>人が確認</TableHead>
                  <TableHead>覆した</TableHead>
                  <TableHead>割合</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.practiceMedium.length === 0 ? (
                  <Empty cols={5} />
                ) : (
                  metrics.practiceMedium.map((m) => (
                    <TableRow key={m.stageId} className={cn(m.exceeds && "bg-danger-soft/40")}>
                      <TableCell>{m.stageTitle}</TableCell>
                      <TableCell>{m.aiPassed}</TableCell>
                      <TableCell>{m.checked}</TableCell>
                      <TableCell>{m.overturned}</TableCell>
                      <TableCell>
                        <Rate rate={m.rate} exceeds={m.exceeds} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Section>
          <Section
            title="人に回した提出のうち、人がそのまま合格にした割合"
            note={`種別ごと。${limit(REVIEW_METRIC_ALERTS.escalatedPassedAsIs)} を超える種別は条件が厳しすぎるので、項目の書き方かしきい値を緩めます。理由ごとの内訳も下に出します。`}
          >
            <EscalatedTable rows={metrics.escalatedByKind} keyLabel="課題の種別" />
            <div className="border-t border-border" />
            <EscalatedTable rows={metrics.escalatedByReason} keyLabel="人に回した理由" />
          </Section>
          <Section
            title="課題ごとの、人に回した割合"
            note={`AI が判定した提出のうち。${limit(REVIEW_METRIC_ALERTS.taskEscalated)} を超えたら、AI より先に課題文とルーブリックを見直します。`}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>課題</TableHead>
                  <TableHead>AI が判定</TableHead>
                  <TableHead>人に回した</TableHead>
                  <TableHead>割合</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.taskEscalation.length === 0 ? (
                  <Empty cols={4} />
                ) : (
                  metrics.taskEscalation.map((t) => (
                    <TableRow key={t.taskId} className={cn(t.exceeds && "bg-danger-soft/40")}>
                      <TableCell>
                        <div>{t.taskTitle}</div>
                        <div className="text-[11.5px] text-ink-3">{t.stageTitle}</div>
                      </TableCell>
                      <TableCell>{t.reviewed}</TableCell>
                      <TableCell>{t.escalated}</TableCell>
                      <TableCell>
                        <Rate rate={t.rate} exceeds={t.exceeds} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Section>
        </>
      )}
    </>
  );
}
