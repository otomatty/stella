import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { DISPLAY_NAME } from "@stella/shared/brand/display";
import { achievementFromSnapshot } from "@stella/shared/cms/certificate-achievement";
import type { CertificateRow, StageCompletion } from "@stella/shared/cms/types";
import { toast } from "sonner";
import { Award, Check, ChevronDown, ChevronRight, Clock, Download, LinkIcon } from "@/lib/icons";
import { PageHeader } from "@/components/common/PageHeader";
import { CertificateView } from "@/components/common/CertificateView";
import { Button } from "@/components/ui/button";
import { SkeletonRows } from "@/components/ui/skeleton";
import type { Stage } from "@/data/types";
import { formatIssuedDateJa } from "@/lib/certificate-display";
import { buildCertificateOverview, type OverviewStage } from "@/lib/certificate-overview";
import {
  buildVerificationUrl,
  fetchMyStageCompletions,
  listCertificatesForUser,
} from "@/lib/certificates-api";
import { resumeLessonId } from "@/lib/lesson-progress";
import { useLessonProgressMap } from "@/hooks/useLessonProgress";

interface CertificatePageProps {
  stages: Stage[];
  currentUserId: string | null;
  backendEnabled: boolean;
}

const DEMO_CERTIFICATE: CertificateRow = {
  id: "demo",
  user_id: "demo",
  stage_id: "demo",
  cert_code: "FLC-2026-4A9F-2E11",
  issued_by: null,
  issued_at: "2026-10-28",
  recipient_name: "山田 花子",
  stage_title: "HTML/CSSとデザイン基礎",
  issuer_name: DISPLAY_NAME,
  revoked: false,
  criteria_snapshot: {
    criteria: { require_all_lessons: true, require_assignment_pass: true },
    completed_lessons: 24,
    total_lessons: 24,
    passed_assignments: 6,
    total_assignments: 6,
  },
};

export function CertificatePage({ stages, currentUserId, backendEnabled }: CertificatePageProps) {
  return (
    <div className="mx-auto w-full min-w-0 max-w-[1040px] pb-16">
      <PageHeader
        title="修了証"
        sub="ステージの修了条件を満たすと、自動で発行されます。証書は PDF で保存でき、検証用のリンクで誰にでも本物だと確かめてもらえます。"
      />
      {!backendEnabled ? (
        <CertificateList stages={[]} certificates={[DEMO_CERTIFICATE]} completions={[]} demo />
      ) : !currentUserId ? (
        <SkeletonRows rows={3} className="py-6" />
      ) : (
        <LiveCertificates key={currentUserId} stages={stages} userId={currentUserId} />
      )}
    </div>
  );
}

function LiveCertificates({ stages, userId }: { stages: Stage[]; userId: string }) {
  const [certificates, setCertificates] = useState<CertificateRow[]>([]);
  const [completions, setCompletions] = useState<StageCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  // Strict Mode の effect 再実行でもバックフィルを二重に呼ばない。
  const request = useRef<Promise<{
    certificates: CertificateRow[];
    completions: StageCompletion[];
  }> | null>(null);
  useEffect(() => {
    let cancelled = false;
    request.current ??= (async () => {
      let certificates: CertificateRow[] = [];
      let completions: StageCompletion[] = [];
      try {
        certificates = await listCertificatesForUser(userId);
      } catch {
        toast.error("修了証の読み込みに失敗しました");
      }
      try {
        completions = await fetchMyStageCompletions();
      } catch {
        toast.error("修了条件の読み込みに失敗しました");
      }
      return { certificates, completions };
    })();
    void request.current.then((result) => {
      if (cancelled) return;
      setCertificates(result.certificates);
      setCompletions(result.completions);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);
  return loading ? (
    <SkeletonRows rows={3} className="py-6" />
  ) : (
    <CertificateList stages={stages} certificates={certificates} completions={completions} />
  );
}

function CertificateList({
  stages,
  certificates,
  completions,
  demo = false,
}: {
  stages: Stage[];
  certificates: CertificateRow[];
  completions: StageCompletion[];
  demo?: boolean;
}) {
  const { issued, pending, near, idle } = buildCertificateOverview({
    stages,
    certificates,
    completions,
  });
  const [idleExpanded, setIdleExpanded] = useState(false);
  return (
    <div className="flex min-w-0 flex-col gap-6 sm:gap-10">
      {pending.length > 0 && (
        <section aria-labelledby="pending-h" className="space-y-3">
          <SectionTitle id="pending-h" count={pending.length}>
            発行待ち
          </SectionTitle>
          {pending.map((stage) => (
            <div
              key={stage.id}
              className="flex flex-wrap items-center gap-4 rounded-xl border border-warning/30 bg-warning-soft p-4 sm:px-5"
            >
              <div className="grid size-10 shrink-0 place-items-center rounded-full bg-warning-soft">
                <Clock size={20} aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1 basis-52">
                <h3 className="text-[15px] font-semibold">{stage.title}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
                  {stage.autoIssue
                    ? "修了条件をすべて満たしました。まもなく発行されます。少しあとで開き直してください。"
                    : "修了条件をすべて満たしました。このステージは講師が確かめてから修了証を発行します。発行されると「発行済み」に並びます。"}
                </p>
              </div>
              <span className="rounded-full bg-warning-soft px-3 py-1 text-xs font-semibold">
                {stage.autoIssue ? "発行の準備中" : "講師の確認待ち"}
              </span>
            </div>
          ))}
        </section>
      )}
      <section aria-labelledby="issued-h" className="space-y-3.5">
        <SectionTitle id="issued-h" count={issued.length}>
          発行済み
        </SectionTitle>
        {issued.length > 0 ? (
          <>
            <div className="hidden gap-5 sm:grid sm:grid-cols-[repeat(auto-fill,minmax(332px,1fr))]">
              {issued.map((cert) => (
                <IssuedCertificate key={cert.id} cert={cert} demo={demo} />
              ))}
            </div>
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card sm:hidden">
              {issued.map((cert) => {
                const content = (
                  <>
                    <div
                      aria-hidden="true"
                      className="w-28 shrink-0 overflow-hidden rounded-sm border border-border"
                    >
                      <CertificatePreview cert={cert} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold leading-snug">{cert.stage_title}</h3>
                      <p className="mt-1 text-xs text-ink-3">
                        {formatIssuedDateJa(cert.issued_at)} 発行
                      </p>
                    </div>
                    {!demo && (
                      <ChevronRight size={18} className="shrink-0 text-ink-3" aria-hidden="true" />
                    )}
                  </>
                );
                const className = "flex min-h-11 items-center gap-3.5 p-3.5";
                return demo ? (
                  <div key={cert.id} className={className}>
                    {content}
                  </div>
                ) : (
                  <Link
                    key={cert.id}
                    to="/certificates/$certId"
                    params={{ certId: cert.id }}
                    aria-label={`${cert.stage_title} の修了証を開く`}
                    className={className}
                  >
                    {content}
                  </Link>
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border-2 bg-card px-6 py-10 text-center">
            <Award size={48} className="text-brand" aria-hidden="true" />
            <h3 className="font-semibold">まだ修了証はありません</h3>
            <p className="max-w-lg text-[13px] leading-relaxed text-ink-2">
              ステージの修了条件を満たすと、ここに修了証が届きます。
              {near[0] &&
                `いちばん近いのは「${near[0].title}」で、あと ${near[0].remaining} 件です。`}
            </p>
            {near[0] ? (
              <ResumeButton stage={near[0]}>続きから進める</ResumeButton>
            ) : (
              <Button asChild variant="primary">
                <Link to="/">スキルツリーへ</Link>
              </Button>
            )}
          </div>
        )}
      </section>
      {near.length > 0 && (
        <section aria-labelledby="near-h" className="space-y-3.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <SectionTitle id="near-h">修了まであと少し</SectionTitle>
            <span className="text-xs text-ink-3">残りの少ない順</span>
          </div>
          {near.map((stage) => (
            <div
              key={stage.id}
              className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-5 sm:px-5 sm:py-4"
            >
              <div className="min-w-0 flex-1 space-y-2 sm:basis-[300px]">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h3 className="text-[15px] font-semibold">{stage.title}</h3>
                    {stage.category && (
                      <span className="hidden rounded-full bg-muted px-2 py-0.5 text-xs text-ink-2 sm:inline">
                        {stage.category}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-semibold tabular-nums text-ink-2 sm:hidden">
                    {stage.percent}%
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    role="progressbar"
                    aria-label={`${stage.title} の進み具合`}
                    aria-valuenow={stage.percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted sm:max-w-[380px]"
                  >
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: `${stage.percent}%` }}
                    />
                  </div>
                  <span className="hidden text-xs font-semibold tabular-nums text-ink-2 sm:inline">
                    {stage.percent}%
                  </span>
                </div>
                <ul className="hidden flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2 sm:flex">
                  {stage.items.map((item) => (
                    <li key={item.label} className="inline-flex items-center gap-1">
                      {item.met && (
                        <Check
                          size={14}
                          className="text-success"
                          aria-label="満たした"
                          role="img"
                        />
                      )}
                      {item.label}{" "}
                      <span className="font-mono">
                        {item.done}/{item.total}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex items-center justify-between gap-3 sm:gap-4">
                <span className="text-[13px] text-ink-2">
                  <span className="sm:hidden">あと {stage.remaining} 件</span>
                  <span className="hidden sm:inline">{stage.remainingText}</span>
                </span>
                <ResumeButton stage={stage}>続きから</ResumeButton>
              </div>
            </div>
          ))}
        </section>
      )}
      {idle.length > 0 && (
        <section className="space-y-2">
          <button
            type="button"
            aria-expanded={idleExpanded}
            aria-controls="idle-stages"
            onClick={() => setIdleExpanded(!idleExpanded)}
            className="flex min-h-11 items-center gap-1.5 text-[13px] text-ink-2"
          >
            <ChevronDown
              size={14}
              className={idleExpanded ? "" : "-rotate-90"}
              aria-hidden="true"
            />
            まだ進めていないステージ（{idle.length}）
          </button>
          {idleExpanded && (
            <ul
              id="idle-stages"
              className="divide-y divide-border rounded-xl border border-border bg-card"
            >
              {idle.map((stage) => (
                <li
                  key={stage.id}
                  className="flex flex-wrap justify-between gap-2 px-5 py-3 text-[13px]"
                >
                  <span>{stage.title}</span>
                  <span className="text-ink-3">まだ始めていません</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <p className="text-[13px] text-ink-3">
        ほかのステージは{" "}
        <Link to="/" className="text-brand underline underline-offset-2">
          スキルツリー
        </Link>{" "}
        から始められます。
      </p>
    </div>
  );
}

function SectionTitle({
  id,
  count,
  children,
}: {
  id: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <h2 id={id} className="flex items-center gap-2 text-[15px] font-bold">
      {children}
      {count !== undefined && (
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-ink-2">
          {count}
        </span>
      )}
    </h2>
  );
}

function ResumeButton({ stage, children }: { stage: OverviewStage; children: ReactNode }) {
  const progressMap = useLessonProgressMap();
  const lessonId = resumeLessonId(stage.stage, progressMap);
  return (
    <Button asChild className="min-h-11 sm:min-h-9">
      {lessonId ? (
        <Link to="/stages/$stageId/lessons/$lessonId" params={{ stageId: stage.id, lessonId }}>
          {children}
          <ChevronRight size={14} aria-hidden="true" />
        </Link>
      ) : (
        <Link to="/stages/$stageId" params={{ stageId: stage.id }}>
          {children}
          <ChevronRight size={14} aria-hidden="true" />
        </Link>
      )}
    </Button>
  );
}

function CertificatePreview({ cert }: { cert: CertificateRow }) {
  return (
    <CertificateView
      recipientName={cert.recipient_name}
      stageTitle={cert.stage_title}
      issuer={cert.issuer_name}
      issuedAt={formatIssuedDateJa(cert.issued_at)}
      certCode={cert.cert_code}
      verifyUrl={buildVerificationUrl(cert.cert_code)}
      achievement={achievementFromSnapshot(cert.criteria_snapshot)}
    />
  );
}

function IssuedCertificate({ cert, demo }: { cert: CertificateRow; demo: boolean }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );
  async function copy() {
    try {
      await navigator.clipboard.writeText(buildVerificationUrl(cert.cert_code));
      toast("検証用のリンクをコピーしました");
      setCopied(true);
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("検証用のリンクをコピーできませんでした");
    }
  }
  const preview = (
    <div aria-hidden="true" className="w-full max-w-[292px] overflow-hidden rounded-sm shadow-lg">
      <CertificatePreview cert={cert} />
    </div>
  );
  return (
    <article className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card">
      {demo ? (
        <div className="flex justify-center bg-brand-soft p-5">{preview}</div>
      ) : (
        <Link
          to="/certificates/$certId"
          params={{ certId: cert.id }}
          aria-label={`${cert.stage_title} の修了証を開く`}
          className="flex justify-center bg-brand-soft p-5"
        >
          {preview}
        </Link>
      )}
      <div className="p-4 sm:px-[18px] sm:pb-[18px]">
        <h3 className="text-[15px] font-semibold">{cert.stage_title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-ink-3">
          {formatIssuedDateJa(cert.issued_at)} 発行 ·{" "}
          <span className="break-all font-mono">{cert.cert_code}</span>
        </p>
        {!demo && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="primary">
              <Link to="/certificates/$certId" params={{ certId: cert.id }}>
                開く
              </Link>
            </Button>
            <Button asChild>
              <Link to="/certificates/$certId" params={{ certId: cert.id }} search={{ print: "1" }}>
                <Download size={14} aria-hidden="true" />
                PDF
              </Link>
            </Button>
            <Button onClick={() => void copy()}>
              <LinkIcon size={14} aria-hidden="true" />
              {copied ? "コピーしました" : "リンクをコピー"}
            </Button>
          </div>
        )}
      </div>
    </article>
  );
}
