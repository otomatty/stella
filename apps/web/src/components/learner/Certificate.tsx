/**
 * 受講者の修了証ページ (Issue #26)。
 *
 * - バックエンド設定 + ログイン時: 実データで動作する。
 *   - 発行済みの修了証を一覧表示 (印刷 / 公開検証ページへのリンク付き)。
 *   - 受講中コースの達成状況 (進捗 + 小テスト + 課題) を成績台帳として表示し、
 *     基準達成かつ未発行のコースは受講者自身が「発行する」ボタンで発行できる
 *     (コースが auto_issue_certificate のときも、 ここでの発行が実体化トリガになる)。
 * - バックエンド未設定 (fixtures デモ) 時: 従来どおり静的テンプレートを表示する。
 */

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import {
  Download,
  ExternalLink,
  Loader2,
  Award,
  CheckCircle,
} from '@/lib/icons';
import { PageHeader } from '@/components/common/PageHeader';
import { CertificateView, formatIssuedAt } from '@/components/common/CertificateView';
import { Button } from '@/components/ui/button';
import type { Course } from '@/data/types';
import type { CertificateRow, CourseCompletion } from '@falcon/shared/cms/types';
import {
  buildVerificationUrl,
  fetchMyCourseCompletion,
  issueCertificate,
  listCertificatesForUser,
} from '@/lib/certificates-api';

interface CertificatePageProps {
  courses: Course[];
  currentUserId: string | null;
  studentName: string;
  studentInitials: string;
  tenantName: string;
  backendEnabled: boolean;
}

export const CertificatePage = ({
  courses,
  currentUserId,
  studentName,
  studentInitials,
  tenantName,
  backendEnabled,
}: CertificatePageProps) => {
  if (!backendEnabled) {
    return <DemoCertificate name={studentName} initials={studentInitials} />;
  }
  // バックエンド設定済みでセッション復元中 (userId 未取得) はデモ証書ではなく読み込み表示。
  if (!currentUserId) {
    return (
      <div className="py-16 text-center text-sm text-ink-3">読み込み中…</div>
    );
  }
  return (
    <LiveCertificates
      courses={courses}
      userId={currentUserId}
      studentInitials={studentInitials}
      tenantName={tenantName}
    />
  );
};

// ---------------------------------------------------------------
// 実データ版
// ---------------------------------------------------------------

interface LiveProps {
  courses: Course[];
  userId: string;
  studentInitials: string;
  tenantName: string;
}

function LiveCertificates({ courses, userId, studentInitials, tenantName }: LiveProps) {
  const [certs, setCerts] = useState<CertificateRow[]>([]);
  const [completions, setCompletions] = useState<Record<string, CourseCompletion | null>>({});
  const [loading, setLoading] = useState(true);
  const [issuingId, setIssuingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [certRows, completionPairs] = await Promise.all([
        listCertificatesForUser(userId),
        Promise.all(
          courses.map(async (c) => {
            try {
              return [c.id, await fetchMyCourseCompletion(c.id)] as const;
            } catch {
              return [c.id, null] as const;
            }
          }),
        ),
      ]);
      setCerts(certRows);
      setCompletions(Object.fromEntries(completionPairs));
    } catch (err) {
      console.error('[CertificatePage] load failed', err);
      toast.error('修了証の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, [userId, courses]);

  useEffect(() => {
    void load();
  }, [load]);

  const onIssue = async (courseId: string) => {
    setIssuingId(courseId);
    try {
      const result = await issueCertificate(courseId, userId);
      toast.success(
        result.already_existed ? '修了証は既に発行済みです' : '修了証を発行しました',
      );
      await load();
    } catch (err) {
      toast.error(`発行に失敗しました: ${err instanceof Error ? err.message : 'unknown'}`);
    } finally {
      setIssuingId(null);
    }
  };

  const certByCourse = new Map(certs.map((c) => [c.course_id, c]));
  // 未発行で基準達成のコース (自動発行可なら本人発行、 不可なら講師承認待ち)。
  const issuable = courses.filter(
    (c) => !certByCourse.has(c.id) && completions[c.id]?.met,
  );
  // 受講中 (未達成 / 集計あり) のコース。
  const inProgress = courses.filter(
    (c) => !certByCourse.has(c.id) && completions[c.id] && !completions[c.id]?.met,
  );

  return (
    <>
      <PageHeader title="修了証" sub="修了したコースの修了証を確認・発行できます" />

      {loading ? (
        <div className="flex items-center justify-center gap-2 text-sm text-ink-3 py-16">
          <Loader2 size={16} className="animate-spin" />
          読み込み中…
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {/* 発行可能 (基準達成・未発行) */}
          {issuable.length > 0 ? (
            <section>
              <SectionTitle>発行可能な修了証</SectionTitle>
              <div className="flex flex-col gap-2">
                {issuable.map((c) => {
                  const autoIssue =
                    completions[c.id]?.criteria.auto_issue_certificate ?? true;
                  return (
                    <div
                      key={c.id}
                      className="flex items-center gap-3 bg-card border border-border rounded-md px-4 py-3"
                    >
                      <CheckCircle size={18} className="text-brand shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13.5px] font-medium truncate">{c.title}</div>
                        <div className="text-[12px] text-ink-3">修了基準を達成しました</div>
                      </div>
                      {autoIssue ? (
                        <Button
                          variant="accent"
                          disabled={issuingId === c.id}
                          onClick={() => void onIssue(c.id)}
                        >
                          {issuingId === c.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Award size={14} />
                          )}
                          発行する
                        </Button>
                      ) : (
                        <span className="text-[12px] text-ink-4 shrink-0">講師の承認待ち</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* 発行済み */}
          <section>
            <SectionTitle>発行済みの修了証</SectionTitle>
            {certs.length === 0 ? (
              <div className="text-[13px] text-ink-3 bg-card border border-border rounded-md px-4 py-6 text-center">
                まだ発行された修了証はありません。 コースを修了すると、 ここから発行できます。
              </div>
            ) : (
              <div className="flex flex-col gap-8">
                {certs.map((cert) => (
                  <IssuedCertificate
                    key={cert.id}
                    cert={cert}
                    fallbackInitials={studentInitials}
                  />
                ))}
              </div>
            )}
          </section>

          {/* 受講中の達成状況 (成績台帳) */}
          {inProgress.length > 0 ? (
            <section>
              <SectionTitle>受講中コースの達成状況</SectionTitle>
              <div className="flex flex-col gap-2">
                {inProgress.map((c) => (
                  <CompletionRow
                    key={c.id}
                    title={c.title}
                    completion={completions[c.id] ?? null}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {courses.length === 0 ? (
            <div className="text-[13px] text-ink-3">
              受講登録されたコースがありません。
            </div>
          ) : null}

          <p className="text-[11.5px] text-ink-4">発行者: {tenantName}</p>
        </div>
      )}
    </>
  );
}

function IssuedCertificate({
  cert,
  fallbackInitials,
}: {
  cert: CertificateRow;
  fallbackInitials: string;
}) {
  const verifyUrl = buildVerificationUrl(cert.cert_code);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end gap-2">
        <Button onClick={() => window.print()}>
          <Download size={14} />
          PDF / 印刷
        </Button>
        <Button asChild>
          <a href={verifyUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={14} />
            公開検証ページ
          </a>
        </Button>
      </div>
      <CertificateView
        recipientName={cert.recipient_name}
        courseTitle={cert.course_title}
        issuer={cert.tenant_name}
        issuedAt={formatIssuedAt(cert.issued_at)}
        certCode={cert.cert_code}
        initials={fallbackInitials}
      />
    </div>
  );
}

function CompletionRow({
  title,
  completion,
}: {
  title: string;
  completion: CourseCompletion | null;
}) {
  return (
    <div className="bg-card border border-border rounded-md px-4 py-3">
      <div className="text-[13.5px] font-medium mb-1.5">{title}</div>
      {completion ? (
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-ink-3">
          <Metric
            label="レッスン"
            value={`${completion.completed_lessons}/${completion.total_lessons}`}
            required={completion.criteria.require_all_lessons}
          />
          <Metric
            label="小テスト"
            value={`${completion.passed_quizzes}/${completion.total_quizzes}`}
            required={completion.criteria.require_quiz_pass}
          />
          <Metric
            label="課題"
            value={`${completion.passed_assignments}/${completion.total_assignments}`}
            required={completion.criteria.require_assignment_pass}
          />
        </div>
      ) : (
        <div className="text-[12px] text-ink-4">達成状況を取得できませんでした</div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  required,
}: {
  label: string;
  value: string;
  required: boolean;
}) {
  return (
    <span className={required ? '' : 'opacity-50'}>
      {label}: <span className="font-mono text-ink-2">{value}</span>
      {required ? '' : ' (任意)'}
    </span>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-[11px] font-semibold uppercase tracking-widest text-ink-4 mb-3">
      {children}
    </h2>
  );
}

// ---------------------------------------------------------------
// fixtures デモ版 (バックエンド未設定時)
// ---------------------------------------------------------------

function DemoCertificate({ name, initials }: { name: string; initials: string }) {
  return (
    <>
      <PageHeader
        title="修了証"
        sub="発行済みの修了証を確認できます (デモ表示)"
        actions={
          <Button onClick={() => window.print()}>
            <Download size={14} />
            PDF / 印刷
          </Button>
        }
      />
      <CertificateView
        recipientName={name}
        courseTitle="Git / GitHub 実務ワークフロー"
        issuer="FALCON INFORMAL"
        issuedAt="2026-04-10"
        certCode="FLC-2026-4A9F-2E11"
        initials={initials}
      />
    </>
  );
}
