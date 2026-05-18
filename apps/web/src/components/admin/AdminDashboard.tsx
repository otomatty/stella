import {
  Calendar,
  Download,
  Users,
  CheckCircle,
  Award,
  Clock,
  TrendingUp,
  TrendingDown,
  ChevronRight,
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
import { ENROLLMENT_TREND, COMPLETION_BY_COURSE, STUMBLES } from '@/data/fixtures';

export const AdminDashboard = () => (
  <>
    <PageHeader
      title="テナントKPIダッシュボード"
      sub="SES未経験エンジニア育成 · 2026年4月"
      actions={
        <>
          <Button>
            <Calendar size={14} />
            直近30日
          </Button>
          <Button>
            <Download size={14} />
            CSV/Excel 出力
          </Button>
        </>
      }
    />

    <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
      <KpiCard
        label={
          <>
            <Users size={12} /> アクティブ受講者
          </>
        }
        value={163}
        unit="名"
        trend={
          <>
            <TrendingUp size={12} />
            +7 先月比
          </>
        }
        trendDir="up"
      />
      <KpiCard
        label={
          <>
            <CheckCircle size={12} /> コース完了率
          </>
        }
        value={58}
        unit="%"
        trend={
          <>
            <TrendingUp size={12} />
            +3pt
          </>
        }
        trendDir="up"
      />
      <KpiCard
        label={
          <>
            <Award size={12} /> 修了証 発行数
          </>
        }
        value={47}
        unit="件 / 今月"
        trend="累計 284件"
      />
      <KpiCard
        label={
          <>
            <Clock size={12} /> 平均受講時間
          </>
        }
        value="4.2"
        unit="時間/週"
        trend={
          <>
            <TrendingDown size={12} />
            -0.3h
          </>
        }
        trendDir="down"
      />
    </div>

    <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: '2fr 1fr' }}>
      <Card>
        <CardHeader>
          <CardTitle>アクティブ受講者の推移</CardTitle>
          <CardActions>
            <span className="text-[11.5px] text-ink-3">過去12ヶ月</span>
          </CardActions>
        </CardHeader>
        <div className="p-4 h-[260px]">
          <EnrollmentChart />
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

    <div className="grid gap-4" style={{ gridTemplateColumns: '2fr 1fr' }}>
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
              <TableHead />
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
                  <TableCell>
                    <ChevronRight size={13} className="text-ink-4" />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <div className="flex flex-col gap-4">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>組織別受講状況</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>組織</TableHead>
                <TableHead>受講者</TableHead>
                <TableHead>完了率</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ORGS.map((o, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{o.n}</TableCell>
                  <TableCell className="tabular-nums text-[11.5px]">{o.u}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-[60px]">
                        <Progress value={o.p} tone="brand" />
                      </div>
                      <span className="font-mono text-[11.5px]">{o.p}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI利用・コスト</CardTitle>
          </CardHeader>
          <div className="px-4 py-3.5">
            <div className="flex items-center mb-4">
              <div className="flex-1">
                <div className="text-[11.5px] text-ink-3">今月使用量</div>
                <div className="text-xl font-semibold mt-0.5">
                  2.4M <span className="text-[11px] text-ink-3">tokens</span>
                </div>
              </div>
              <div className="flex-1">
                <div className="text-[11.5px] text-ink-3">月間上限</div>
                <div className="text-xl font-semibold mt-0.5">
                  5.0M <span className="text-[11px] text-ink-3">tokens</span>
                </div>
              </div>
            </div>
            <Progress value={48} tone="brand" />
            <div className="flex items-center mt-4 text-[11.5px] text-ink-3">
              <span>添削補助: 62% · Q&A: 28% · 採点: 10%</span>
              <div className="flex-1" />
              <span>Claude Haiku 4.5</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  </>
);

const ORGS = [
  { n: 'FALCON INFORMAL 本社', u: 62, p: 64 },
  { n: '株式会社テックソリューション', u: 28, p: 72 },
  { n: '合同会社ブルーコード', u: 18, p: 48 },
  { n: '株式会社システムズ', u: 14, p: 55 },
  { n: 'その他（個人契約）', u: 41, p: 51 },
];

const EnrollmentChart = () => {
  const pts = ENROLLMENT_TREND.map((v, i) => [50 + i * 42, 190 - (v / 200) * 160] as const);
  const path = 'M ' + pts.map((p) => p.join(' ')).join(' L ');
  const area = `${path} L ${pts[pts.length - 1][0]} 190 L ${pts[0][0]} 190 Z`;
  const months = ['5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月', '1月', '2月', '3月', '4月'];

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
      {[30, 70, 110, 150, 190].map((y, i) => (
        <text key={i} x="35" y={y + 3} textAnchor="end" className="fill-ink-3 text-[10.5px]">
          {[200, 150, 100, 50, 0][i]}
        </text>
      ))}
      <path d={area} fill="var(--brand-soft)" />
      <path d={path} stroke="var(--brand)" strokeWidth={2} fill="none" strokeLinecap="round" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill="var(--brand)" />
      ))}
      {months.map((m, i) => (
        <text
          key={i}
          x={50 + i * 42}
          y="210"
          textAnchor="middle"
          className="fill-ink-3 text-[10.5px]"
        >
          {m}
        </text>
      ))}
    </svg>
  );
};
