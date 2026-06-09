/**
 * 講師/管理者向け成績台帳 (gradebook) (Issue #26)。
 *
 * コースを選ぶと、 受講登録された受講者ごとの達成状況 (進捗 + 小テスト + 課題) を
 * 一覧表示する。 基準達成かつ未発行の受講者は、 この画面から修了証を承認発行できる。
 *
 * データは get_course_gradebook RPC (staff のみ / security definer) から取得する。
 * Supabase 未設定時は実データが無いため、 その旨を案内する。
 */

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Award, CheckCircle, Loader2 } from '@/lib/icons';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Course } from '@/data/types';
import type { CourseGradebook, GradebookEntry } from '@falcon/shared/cms/types';
import { isSupabaseConfigured } from '@/lib/supabase';
import { fetchCourseGradebook, issueCertificate } from '@/lib/certificates-api';

interface GradebookProps {
  courses: Course[];
}

export const Gradebook = ({ courses }: GradebookProps) => {
  const [courseId, setCourseId] = useState<string>(() => courses[0]?.id ?? '');
  const [data, setData] = useState<CourseGradebook | null>(null);
  const [loading, setLoading] = useState(false);
  const [issuingUser, setIssuingUser] = useState<string | null>(null);

  const supabaseEnabled = isSupabaseConfigured();

  const load = useCallback(async () => {
    if (!supabaseEnabled || !courseId) {
      setData(null);
      return;
    }
    setLoading(true);
    try {
      setData(await fetchCourseGradebook(courseId));
    } catch (err) {
      console.error('[Gradebook] load failed', err);
      toast.error('成績台帳の取得に失敗しました');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [supabaseEnabled, courseId]);

  useEffect(() => {
    void load();
  }, [load]);

  // courses は Supabase 設定時に非同期で到着する (初期は fixtures / 空)。
  // 選択中の courseId が未設定 / 現在の一覧に無い場合は先頭コースへ補正し、
  // ロード前の fixture id のまま台帳取得が空振りし続けるのを防ぐ。
  useEffect(() => {
    const firstId = courses[0]?.id ?? '';
    if (!firstId) return;
    if (!courseId || !courses.some((c) => c.id === courseId)) {
      setCourseId(firstId);
    }
  }, [courses, courseId]);

  const onIssue = async (userId: string) => {
    if (!courseId) return;
    setIssuingUser(userId);
    try {
      const result = await issueCertificate(courseId, userId);
      toast.success(
        result.already_existed ? '既に発行済みです' : '修了証を発行しました',
      );
      await load();
    } catch (err) {
      toast.error(`発行に失敗しました: ${err instanceof Error ? err.message : 'unknown'}`);
    } finally {
      setIssuingUser(null);
    }
  };

  return (
    <>
      <PageHeader
        title="成績台帳"
        sub="受講者ごとの達成状況を確認し、 修了証を発行できます"
        actions={
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="h-8 rounded-sm border border-border-2 bg-card px-3 text-[13px]"
          >
            {courses.length === 0 ? <option value="">コースなし</option> : null}
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        }
      />

      {!supabaseEnabled ? (
        <div className="text-[13px] text-ink-3 bg-card border border-border rounded-md px-4 py-6 text-center">
          成績台帳は Supabase 接続時に実データで動作します (現在はデモ表示のため利用できません)。
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center gap-2 text-sm text-ink-3 py-16">
          <Loader2 size={16} className="animate-spin" />
          読み込み中…
        </div>
      ) : !data ? (
        <div className="text-[13px] text-ink-3">コースを選択してください。</div>
      ) : data.rows.length === 0 ? (
        <div className="text-[13px] text-ink-3 bg-card border border-border rounded-md px-4 py-6 text-center">
          このコースに受講登録された受講者はいません。
        </div>
      ) : (
        <GradebookTable
          rows={data.rows}
          issuingUser={issuingUser}
          onIssue={(uid) => void onIssue(uid)}
        />
      )}
    </>
  );
};

function GradebookTable({
  rows,
  issuingUser,
  onIssue,
}: {
  rows: GradebookEntry[];
  issuingUser: string | null;
  onIssue: (userId: string) => void;
}) {
  return (
    <div className="bg-card border border-border rounded-md overflow-hidden">
      <table className="w-full text-[12.5px]">
        <thead>
          <tr className="text-left text-ink-4 border-b border-border">
            <th className="font-semibold px-4 py-2.5">受講者</th>
            <th className="font-semibold px-3 py-2.5">レッスン</th>
            <th className="font-semibold px-3 py-2.5">小テスト</th>
            <th className="font-semibold px-3 py-2.5">課題</th>
            <th className="font-semibold px-3 py-2.5">状態</th>
            <th className="font-semibold px-4 py-2.5 text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const c = row.completion;
            const hasCert = Boolean(c?.has_certificate);
            const met = Boolean(c?.met);
            return (
              <tr key={row.user_id} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5">
                  <div className="font-medium text-foreground">{row.display_name}</div>
                  {row.email ? (
                    <div className="text-[11px] text-ink-4">{row.email}</div>
                  ) : null}
                </td>
                <td className="px-3 py-2.5 font-mono text-ink-2">
                  {c ? `${c.completed_lessons}/${c.total_lessons}` : '—'}
                </td>
                <td className="px-3 py-2.5 font-mono text-ink-2">
                  {c ? `${c.passed_quizzes}/${c.total_quizzes}` : '—'}
                </td>
                <td className="px-3 py-2.5 font-mono text-ink-2">
                  {c ? `${c.passed_assignments}/${c.total_assignments}` : '—'}
                </td>
                <td className="px-3 py-2.5">
                  {hasCert ? (
                    <Badge variant="success">発行済み</Badge>
                  ) : met ? (
                    <span className="inline-flex items-center gap-1 text-brand">
                      <CheckCircle size={13} />
                      達成
                    </span>
                  ) : (
                    <span className="text-ink-4">未達成</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {!hasCert && met ? (
                    <Button
                      size="sm"
                      variant="accent"
                      disabled={issuingUser === row.user_id}
                      onClick={() => onIssue(row.user_id)}
                    >
                      {issuingUser === row.user_id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Award size={13} />
                      )}
                      発行
                    </Button>
                  ) : hasCert && c?.cert_code ? (
                    <span className="font-mono text-[11px] text-ink-4">{c.cert_code}</span>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
