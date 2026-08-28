import {
  Calendar,
  Edit,
  AlertTriangle,
  Star,
  TrendingUp,
  TrendingDown,
  Sparkles,
  ChevronRight,
} from "@/lib/icons";
import { PageHeader } from "@/components/common/PageHeader";
import { KpiCard } from "@/components/common/KpiCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardActions } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import type { AvatarTone, Tenant } from "@/data/types";
import type { InstructorStudentProgress } from "@falcon/shared/cms/types";
import { useSubmissions } from "@/hooks/useSubmissions";
import { useInstructorOverview } from "@/hooks/useAnalytics";
import { formatSubmittedAt } from "@/lib/submissions-store";
import { cn } from "@/lib/utils";

interface InstructorDashboardProps {
  tenantId: Tenant["id"];
  setPage: (p: string) => void;
  onOpenReview: (submissionId: string) => void;
  backendEnabled: boolean;
}

const AVATAR_TONES: AvatarTone[] = ["c1", "c2", "c3", "c4", "c5", "c6"];

function toneFromId(id: string): AvatarTone {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i)) % AVATAR_TONES.length;
  return AVATAR_TONES[h] ?? "c1";
}

/** 進捗率 + 遅延フラグから受講状況バッジを決める。 */
function severityOf(s: InstructorStudentProgress): {
  label: string;
  sev: "success" | "warning" | "danger";
} {
  if (s.overdue || s.progress_pct < 25) return { label: "遅延", sev: "danger" };
  if (s.progress_pct < 60) return { label: "やや遅延", sev: "warning" };
  return { label: "順調", sev: "success" };
}

export const InstructorDashboard = ({
  tenantId,
  setPage,
  onOpenReview,
  backendEnabled,
}: InstructorDashboardProps) => {
  const { submissions, pendingCount, aiReadyCount } = useSubmissions(tenantId);
  const pending = submissions.filter((s) => s.status === "pending");

  const { overview } = useInstructorOverview(tenantId, backendEnabled);

  // デモ専用のみデモ定数。backendEnabled 時は overview null → KPI 0 / 空リスト。
  const overdueLearners = overview ? overview.overdue_learners : backendEnabled ? 0 : 4;
  const totalLearners = overview ? overview.total_learners : backendEnabled ? 0 : 42;

  const students: StudentRow[] = overview
    ? overview.students.map((s) => {
        const sv = severityOf(s);
        return {
          id: s.user_id,
          n: s.display_name,
          c: toneFromId(s.user_id),
          p: s.progress_pct,
          stage: s.stage_title,
          s: sv.label,
          sev: sv.sev,
        };
      })
    : backendEnabled
      ? []
      : STUDENT_PROG_DEMO;

  return (
    <>
      <PageHeader
        title="講師ダッシュボード"
        sub="担当受講者の進捗 · 添削"
        actions={
          <>
            <Button>
              <Calendar size={14} />
              今週の予定
            </Button>
            <Button variant="accent" onClick={() => setPage("review-queue")}>
              <Edit size={14} />
              添削を開始
            </Button>
          </>
        }
      />

      <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <KpiCard
          label={
            <>
              <Edit size={12} /> 添削待ち
            </>
          }
          value={pendingCount}
          unit="件"
          trend={
            <>
              <TrendingUp size={12} />
              AI下書き準備済 {aiReadyCount}件
            </>
          }
          trendDir="up"
        />
        <KpiCard
          label={
            <>
              <AlertTriangle size={12} /> 遅延している受講者
            </>
          }
          value={overdueLearners}
          unit={`/ ${totalLearners}名`}
          trend={
            <>
              <TrendingDown size={12} />
              期限超過 · 未完了
            </>
          }
          trendDir={overdueLearners > 0 ? "down" : "up"}
        />
        <KpiCard
          label={
            <>
              <Star size={12} /> AI採用率
            </>
          }
          value="—"
          unit="%"
          trend="計測準備中 (採用ログ未収集)"
        />
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: "2fr 1fr" }}>
        <Card>
          <CardHeader>
            <CardTitle>添削待ちキュー</CardTitle>
            <CardActions>
              <Button size="sm" type="button" onClick={() => setPage("review-queue")}>
                すべて見る ({pendingCount})
              </Button>
            </CardActions>
          </CardHeader>
          <div>
            {pending.slice(0, 4).map((r) => (
              <button
                type="button"
                key={r.id}
                onClick={() => {
                  onOpenReview(r.id);
                  setPage("review");
                }}
                className="w-full grid items-center gap-3.5 px-4 py-3 border-b border-border last:border-b-0 hover:bg-sunken text-left"
                style={{ gridTemplateColumns: "auto 1fr auto auto auto" }}
              >
                <Avatar size="sm">
                  <AvatarFallback tone={r.avatarTone as AvatarTone}>
                    {r.studentInitials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-[13.5px] font-medium">
                    {r.studentName} ·{" "}
                    <span className="text-ink-3 font-normal">{r.assignmentTitle}</span>
                  </div>
                  <div className="text-xs text-ink-3 mt-0.5">
                    {r.stageTitle} · 提出 {formatSubmittedAt(r.submittedAt)}
                  </div>
                </div>
                {r.aiReady ? (
                  <Badge variant="accent">
                    <Sparkles size={10} />
                    AI下書き
                  </Badge>
                ) : (
                  <span />
                )}
                {r.priority === "high" ? (
                  <Badge variant="warning">優先</Badge>
                ) : (
                  <span style={{ width: 60 }} />
                )}
                <ChevronRight size={14} className="text-ink-4" />
              </button>
            ))}
            {pending.length === 0 ? (
              <div className="px-4 py-8 text-center text-ink-3 text-[12.5px]">
                添削待ちの提出物はありません
              </div>
            ) : null}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>担当受講者の進捗</CardTitle>
          </CardHeader>
          <div>
            {students.length === 0 ? (
              <div className="px-4 py-8 text-center text-ink-3 text-[12.5px]">
                受講登録された受講者がいません
              </div>
            ) : (
              students.map((s, i) => (
                <div
                  key={s.id ?? i}
                  className={cn(
                    "flex items-center gap-2.5 px-4 py-2.5",
                    i < students.length - 1 ? "border-b border-border" : "",
                  )}
                >
                  <Avatar size="sm">
                    <AvatarFallback tone={s.c}>{s.n.slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium">{s.n}</div>
                    <div className="text-[11.5px] text-ink-3">{s.stage}</div>
                  </div>
                  <div className="w-20">
                    <Progress value={s.p} tone="ink" />
                    <div className="text-[11.5px] text-ink-3 font-mono text-right mt-0.5">
                      {s.p}%
                    </div>
                  </div>
                  <Badge variant={s.sev}>{s.s}</Badge>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </>
  );
};

interface StudentRow {
  id?: string;
  n: string;
  c: AvatarTone;
  p: number;
  stage: string;
  s: string;
  sev: "success" | "warning" | "danger";
}

// デモ専用のみデモ定数。
const STUDENT_PROG_DEMO: StudentRow[] = [
  { n: "田中 翔太", c: "c1", p: 62, stage: "TypeScript 入門研修", s: "順調", sev: "success" },
  { n: "佐藤 美咲", c: "c2", p: 38, stage: "TypeScript 入門研修", s: "やや遅延", sev: "warning" },
  { n: "鈴木 健一", c: "c3", p: 18, stage: "TypeScript 入門研修", s: "遅延", sev: "danger" },
  { n: "山田 優花", c: "c4", p: 85, stage: "TypeScript 入門研修", s: "順調", sev: "success" },
];
