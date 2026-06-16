/**
 * `/admin/dash` — テナント KPI ダッシュボード (Issue #28)。
 *
 * KPI カード / 受講推移 / コース別完了率 / つまずき分析 / 受講状況サマリを、
 * enrollment + lesson_progress + quiz_attempts + certificates から集計した実データで
 * 表示する (GET /api/analytics/tenant)。 表示中の集計は CSV 出力できる。
 *
 * バックエンド (Neon) 未接続時 (dev fixtures フロー): DB が無いため、 従来の固定サンプルを表示する。
 */

import { toast } from 'sonner';

import {
  Calendar,
  Download,
  Users,
  CheckCircle,
  Award,
  Clock,
  TrendingUp,
  TrendingDown,
  RefreshCw,
} from '@/lib/icons';
import { PageHeader } from '@/components/common/PageHeader';
import { KpiCard } from '@/components/common/KpiCard';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardActions } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import type {
  AnalyticsStumble,
  AnalyticsTrendPoint,
  TenantAnalytics,
} from '@falcon/shared/cms/types';
import { useTenantAnalytics } from '@/hooks/useAnalytics';
import { downloadCsv, toCsv } from '@/lib/csv';
import {
  ENROLLMENT_TREND,
  COMPLETION_BY_COURSE,
  STUMBLES,
} from '@/data/fixtures';

interface Props {
  tenantId: string;
  supabaseEnabled: boolean;
}

export const AdminDashboard = ({ tenantId, supabaseEnabled }: Props) => {
  if (!supabaseEnabled) {
    return <DashboardDemo />;
  }
  return <DashboardLive tenantId={tenantId} />;
};

function DashboardLive({ tenantId }: { tenantId: string }) {
  const { analytics, loading, error, refetch } = useTenantAnalytics(tenantId, true);

  const onExport = () => {
    if (!analytics) return;
    const courseRows = analytics.completion_by_course.map((c) => [c.name, c.n, c.pct]);
    // KPI サマリ + コース別完了率を 1 ファイルにまとめ、 概況を持ち出せるようにする。
    const rows: (string | number)[][] = [
      ['アクティブ受講者', analytics.active_learners],
      ['受講者総数', analytics.total_learners],
      ['コース完了率(%)', analytics.completion_rate],
      ['修了証 今月発行', analytics.certs_this_month],
      ['修了証 累計', analytics.certs_total],
      ['平均学習時間(時間/人)', analytics.avg_study_hours],
      [],
      ['コース', '登録者数', '完了率(%)'],
      ...courseRows,
    ];
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`analytics-${stamp}.csv`, toCsv(['指標', '値'], rows));
    toast.success('レポートを出力しました');
  };

  return (
    <>
      <PageHeader
        title="テナントKPIダッシュボード"
        sub="受講状況 · 完了率 · つまずき分析"
        actions={
          <>
            <Button onClick={() => void refetch()} disabled={loading}>
              <RefreshCw size={14} />
              更新
            </Button>
            <Button onClick={onExport} disabled={!analytics}>
              <Download size={14} />
              CSV出力
            </Button>
          </>
        }
      />

      {error ? (
        <div className="mb-4 rounded-md border border-destructive bg-danger-soft px-3 py-2 text-[12.5px] text-destructive">
          集計の取得に失敗しました: {error}
        </div>
      ) : null}

      {!analytics && loading ? (
        <div className="py-16 text-center text-sm text-ink-3">集計を読み込み中…</div>
      ) : !analytics ? (
        <Card className="text-center p-16 text-ink-3 text-sm">
          集計データがありません。
        </Card>
      ) : (
        <LiveContent analytics={analytics} />
      )}
    </>
  );
}

function LiveContent({ analytics }: { analytics: TenantAnalytics }) {
  return (
    <>
      <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <KpiCard
          label={
            <>
              <Users size={12} /> アクティブ受講者
            </>
          }
          value={analytics.active_learners}
          unit={`名 / 全${analytics.total_learners}`}
          trend={
            <>
              {analytics.new_enrollments_this_month >= analytics.new_enrollments_prev_month ? (
                <TrendingUp size={12} />
              ) : (
                <TrendingDown size={12} />
              )}
              今月 +{analytics.new_enrollments_this_month} 登録
            </>
          }
          trendDir={
            analytics.new_enrollments_this_month >= analytics.new_enrollments_prev_month
              ? 'up'
              : 'down'
          }
        />
        <KpiCard
          label={
            <>
              <CheckCircle size={12} /> コース完了率
            </>
          }
          value={analytics.completion_rate}
          unit="%"
          trend={`完了 ${analytics.status_breakdown.completed} / 受講中 ${analytics.status_breakdown.active}`}
        />
        <KpiCard
          label={
            <>
              <Award size={12} /> 修了証 発行数
            </>
          }
          value={analytics.certs_this_month}
          unit="件 / 今月"
          trend={`累計 ${analytics.certs_total}件`}
        />
        <KpiCard
          label={
            <>
              <Clock size={12} /> 平均学習時間
            </>
          }
          value={analytics.avg_study_hours}
          unit="時間 / 人"
          trend="累計 (動画視聴)"
        />
      </div>

      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <Card>
          <CardHeader>
            <CardTitle>新規受講登録の推移</CardTitle>
            <CardActions>
              <span className="text-[11.5px] text-ink-3">過去12ヶ月</span>
            </CardActions>
          </CardHeader>
          <div className="p-4 h-[260px]">
            <EnrollmentChart trend={analytics.enrollment_trend} />
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>コース別 完了率</CardTitle>
          </CardHeader>
          <div className="px-4 py-3.5">
            {analytics.completion_by_course.length === 0 ? (
              <div className="py-6 text-center text-[12.5px] text-ink-3">
                受講登録がまだありません。
              </div>
            ) : (
              analytics.completion_by_course.map((c) => (
                <div key={c.course_id} className="mb-3.5 last:mb-0">
                  <div className="flex items-center gap-2 text-xs mb-1.5">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-[11.5px] text-ink-3">n={c.n}</span>
                    <div className="flex-1" />
                    <span className="font-mono font-semibold">{c.pct}%</span>
                  </div>
                  <Progress value={c.pct} tone="brand" />
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>課題別つまずき分析</CardTitle>
            <CardActions>
              <span className="text-[11.5px] text-ink-3">正答率の低い順</span>
            </CardActions>
          </CardHeader>
          {analytics.stumbles.length === 0 ? (
            <div className="py-10 text-center text-[12.5px] text-ink-3">
              小テストの受験データがまだありません。
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>設問</TableHead>
                  <TableHead>正答率</TableHead>
                  <TableHead>受験者</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.stumbles.map((s: AnalyticsStumble) => {
                  const tone =
                    s.correct_pct < 40 ? 'danger' : s.correct_pct < 60 ? 'warning' : 'success';
                  return (
                    <TableRow key={s.question_id}>
                      <TableCell>{s.prompt}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-20">
                            <Progress value={s.correct_pct} tone={tone} />
                          </div>
                          <span className="font-mono text-[11.5px]">{s.correct_pct}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-ink-3 tabular-nums">{s.n}回</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>受講状況サマリ</CardTitle>
          </CardHeader>
          <div className="px-4 py-3.5 flex flex-col gap-3">
            <StatusRow label="受講中" value={analytics.status_breakdown.active} tone="brand" total={statusTotal(analytics)} />
            <StatusRow label="完了" value={analytics.status_breakdown.completed} tone="success" total={statusTotal(analytics)} />
            <StatusRow label="期限切れ" value={analytics.status_breakdown.expired} tone="danger" total={statusTotal(analytics)} />
          </div>
        </Card>
      </div>
    </>
  );
}

function statusTotal(a: TenantAnalytics): number {
  const { active, completed, expired } = a.status_breakdown;
  return active + completed + expired;
}

function StatusRow({
  label,
  value,
  tone,
  total,
}: {
  label: string;
  value: number;
  tone: 'brand' | 'success' | 'danger';
  total: number;
}) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div>
      <div className="flex items-center gap-2 text-xs mb-1.5">
        <span className="font-medium">{label}</span>
        <div className="flex-1" />
        <span className="font-mono font-semibold">{value}</span>
        <span className="text-[11.5px] text-ink-3">{pct}%</span>
      </div>
      <Progress value={pct} tone={tone} />
    </div>
  );
}

/** 月次推移を最大値でオートスケールして描く折れ線。 */
function EnrollmentChart({ trend }: { trend: AnalyticsTrendPoint[] }) {
  const counts = trend.map((t) => t.count);
  const max = Math.max(10, ...counts);
  const n = trend.length || 1;
  const step = n > 1 ? 510 / (n - 1) : 0;
  const x = (i: number) => 40 + i * step;
  const y = (v: number) => 190 - (v / max) * 160;
  const pts = trend.map((t, i) => [x(i), y(t.count)] as const);
  const path = pts.length
    ? 'M ' + pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L ')
    : '';
  const area = pts.length
    ? `${path} L ${pts[pts.length - 1][0].toFixed(1)} 190 L ${pts[0][0].toFixed(1)} 190 Z`
    : '';
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * (1 - f)));

  return (
    <svg viewBox="0 0 560 220" className="w-full h-full">
      {[0, 1, 2, 3, 4].map((i) => (
        <line
          key={i}
          x1="40"
          y1={30 + i * 40}
          x2="550"
          y2={30 + i * 40}
          stroke="var(--line)"
          strokeDasharray="2 4"
        />
      ))}
      {ticks.map((t, i) => (
        <text key={i} x="35" y={33 + i * 40} textAnchor="end" className="fill-ink-3 text-[10.5px]">
          {t}
        </text>
      ))}
      {area ? <path d={area} fill="var(--brand-soft)" /> : null}
      {path ? (
        <path d={path} stroke="var(--brand)" strokeWidth={2} fill="none" strokeLinecap="round" />
      ) : null}
      {pts.map(([px, py], i) => (
        <circle key={i} cx={px} cy={py} r="3" fill="var(--brand)" />
      ))}
      {trend.map((t, i) => (
        <text
          key={i}
          x={x(i)}
          y="210"
          textAnchor="middle"
          className="fill-ink-3 text-[10.5px]"
        >
          {t.label}
        </text>
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------
// dev fixtures フロー用のデモ表示 (Supabase 未設定時)。
// ---------------------------------------------------------------

function DashboardDemo() {
  return (
    <>
      <PageHeader
        title="テナントKPIダッシュボード"
        sub="受講状況 · 完了率 · つまずき分析"
        actions={
          <>
            <Button>
              <Calendar size={14} />
              直近30日
            </Button>
            <Button disabled>
              <Download size={14} />
              CSV出力
            </Button>
          </>
        }
      />
      <div className="mb-4 rounded-md border border-border bg-sunken px-3 py-2 text-[12.5px] text-ink-3">
        バックエンド (Neon) 未接続のため、 以下はデモ表示です。 実データの集計・CSV出力には
        <code className="mx-1">VITE_NEON_AUTH_URL</code> / <code className="mx-1">VITE_SERVER_URL</code>
        を設定してください。
      </div>

      <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <KpiCard
          label={<><Users size={12} /> アクティブ受講者</>}
          value={163}
          unit="名"
          trend={<><TrendingUp size={12} />+7 先月比</>}
          trendDir="up"
        />
        <KpiCard
          label={<><CheckCircle size={12} /> コース完了率</>}
          value={58}
          unit="%"
          trend={<><TrendingUp size={12} />+3pt</>}
          trendDir="up"
        />
        <KpiCard
          label={<><Award size={12} /> 修了証 発行数</>}
          value={47}
          unit="件 / 今月"
          trend="累計 284件"
        />
        <KpiCard
          label={<><Clock size={12} /> 平均学習時間</>}
          value="4.2"
          unit="時間/週"
          trend={<><TrendingDown size={12} />-0.3h</>}
          trendDir="down"
        />
      </div>

      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <Card>
          <CardHeader>
            <CardTitle>新規受講登録の推移</CardTitle>
            <CardActions>
              <span className="text-[11.5px] text-ink-3">過去12ヶ月</span>
            </CardActions>
          </CardHeader>
          <div className="p-4 h-[260px]">
            <EnrollmentChart
              trend={ENROLLMENT_TREND.map((count, i) => ({
                month: `m${i}`,
                label: DEMO_MONTHS[i] ?? '',
                count,
              }))}
            />
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>コース別 完了率</CardTitle>
          </CardHeader>
          <div className="px-4 py-3.5">
            {COMPLETION_BY_COURSE.map((c, i) => (
              <div key={i} className="mb-3.5 last:mb-0">
                <div className="flex items-center gap-2 text-xs mb-1.5">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-[11.5px] text-ink-3">n={c.n}</span>
                  <div className="flex-1" />
                  <span className="font-mono font-semibold">{c.pct}%</span>
                </div>
                <Progress value={c.pct} tone="brand" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>課題別つまずき分析</CardTitle>
          <CardActions>
            <span className="text-[11.5px] text-ink-3">正答率の低い順</span>
          </CardActions>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>設問</TableHead>
              <TableHead>正答率</TableHead>
              <TableHead>受験者</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {STUMBLES.map((s, i) => {
              const correct = 100 - Math.round((s.wrong / s.n) * 100);
              const tone =
                correct < 40 ? 'danger' : correct < 60 ? 'warning' : 'success';
              return (
                <TableRow key={i}>
                  <TableCell>{s.q}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-20">
                        <Progress value={correct} tone={tone} />
                      </div>
                      <span className="font-mono text-[11.5px]">{correct}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-ink-3 tabular-nums">{s.n}名</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}

const DEMO_MONTHS = ['5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月', '1月', '2月', '3月', '4月'];
