import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { LearningPacePanel } from "@/components/learner/LearningPacePanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TaskSupportSummary } from "@/components/learner/TaskSupportSummary";
import type { TaskSupportRecord } from "@stella/shared/tasks/support-record";

interface Learners {
  learners: { id: string; name: string; instructorId: string | null }[];
  instructors: { id: string; name: string }[];
}
export function LearningPaceManager({ admin = false }: { admin?: boolean }) {
  const [data, setData] = useState<Learners | null>(null);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [revision, setRevision] = useState(0);
  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const result = await apiFetch<Learners>("/api/learning-pace/learners", { signal });
      if (!signal?.aborted) {
        setData(result);
        setError(null);
      }
    } catch (err) {
      if (!signal?.aborted)
        setError(err instanceof Error ? err.message : "受講者を取得できませんでした");
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);
  const assign = async (instructorId: string) => {
    setSaving(true);
    try {
      await apiFetch(`/api/learning-pace/${encodeURIComponent(selected)}/instructor`, {
        method: "PUT",
        body: { instructor_id: instructorId || null },
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "担当を保存できませんでした");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Card className="mb-5">
      <CardHeader>
        <CardTitle>受講者の学習ペース</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Label htmlFor="pace-learner">{admin ? "受講者" : "担当している受講者"}</Label>
        <select
          id="pace-learner"
          className="w-full border border-border rounded-md bg-background p-2 text-sm"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">受講者を選択してください</option>
          {data?.learners.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        {data && !data.learners.length ? (
          <p className="text-sm text-ink-3">
            担当する受講者がいません。管理者が設定画面から担当講師を登録できます。
          </p>
        ) : null}
        {selected ? (
          <>
            {admin ? (
              <div className="space-y-1">
                <Label htmlFor="pace-instructor">担当講師</Label>
                <select
                  id="pace-instructor"
                  disabled={saving}
                  className="w-full border border-border rounded-md bg-background p-2 text-sm"
                  value={data?.learners.find((l) => l.id === selected)?.instructorId ?? ""}
                  onChange={(e) => void assign(e.target.value)}
                >
                  <option value="">未設定</option>
                  {data?.instructors.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <LearningPacePanel key={`${selected}:${revision}`} userId={selected} />
            <TaskSupportPanel key={`support-${selected}`} userId={selected} />
            <DiagnosisForm
              key={`diagnosis-${selected}`}
              userId={selected}
              onChanged={() => setRevision((n) => n + 1)}
            />
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function DiagnosisForm({ userId, onChanged }: { userId: string; onChanged: () => void }) {
  const [data, setData] = useState<{
    skills: string[];
    confirmed: { skillId: string; evidence: string }[];
  } | null>(null);
  const [skill, setSkill] = useState("");
  const [evidence, setEvidence] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const result = await apiFetch<NonNullable<typeof data>>(
          `/api/learning-pace/${encodeURIComponent(userId)}/diagnostics`,
          { signal },
        );
        if (!signal?.aborted) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (!signal?.aborted)
          setError(err instanceof Error ? err.message : "診断を取得できませんでした");
      }
    },
    [userId],
  );
  useEffect(() => {
    const c = new AbortController();
    void load(c.signal);
    return () => c.abort();
  }, [load]);
  const save = async (remove?: string) => {
    setSaving(true);
    try {
      await apiFetch(
        `/api/learning-pace/${encodeURIComponent(userId)}/diagnostics${remove ? `/${encodeURIComponent(remove)}` : ""}`,
        {
          method: remove ? "DELETE" : "PUT",
          body: remove ? undefined : { skill_id: skill, evidence },
        },
      );
      await load();
      setEvidence("");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "診断を保存できませんでした");
    } finally {
      setSaving(false);
    }
  };
  return (
    <details>
      <summary className="cursor-pointer text-sm font-semibold">開始診断で確認したスキル</summary>
      <p className="text-xs text-ink-3 mt-2">
        根拠を確認して登録すると、そのスキルの練習時間を短縮して予定を引き直します。確認A・Bは維持します。
      </p>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <ul className="text-sm space-y-1 my-2">
        {data?.confirmed.map((c) => (
          <li key={c.skillId}>
            {c.skillId} · {c.evidence}{" "}
            <Button
              size="sm"
              variant="ghost"
              disabled={saving}
              onClick={() => void save(c.skillId)}
            >
              取り消す
            </Button>
          </li>
        ))}
      </ul>
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <Label htmlFor={`pace-skill-${userId}`}>確認したスキル</Label>
        <select
          id={`pace-skill-${userId}`}
          required
          className="w-full border border-border rounded-md bg-background p-2 text-sm"
          value={skill}
          onChange={(e) => setSkill(e.target.value)}
        >
          <option value="">スキルを選択してください</option>
          {data?.skills.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <Label htmlFor={`pace-evidence-${userId}`}>診断の根拠</Label>
        <Input
          id={`pace-evidence-${userId}`}
          required
          maxLength={2000}
          value={evidence}
          onChange={(e) => setEvidence(e.target.value)}
          placeholder="確認した課題・成果物など"
        />
        <Button type="submit" disabled={saving || !skill || !evidence.trim()}>
          確認済みとして登録
        </Button>
      </form>
    </details>
  );
}

/** 課題ごとの支援の記録 (#38)。受講者が自分の課題一覧で見るものと同じ内容。 */
function TaskSupportPanel({ userId }: { userId: string }) {
  const [records, setRecords] = useState<TaskSupportRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    apiFetch<{ tasks: TaskSupportRecord[] }>(
      `/api/task-support?userId=${encodeURIComponent(userId)}`,
      { signal: controller.signal },
    )
      .then((data) => {
        if (!controller.signal.aborted) setRecords(data.tasks);
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted)
          setError(err instanceof Error ? err.message : "支援の記録を取得できませんでした");
      });
    return () => controller.abort();
  }, [userId]);
  return (
    <details>
      <summary className="cursor-pointer text-sm font-semibold">課題ごとの支援の記録</summary>
      <p className="text-xs text-ink-3 mt-2">
        ヒント・解答の表示、講師への相談、人のレビュー、AI
        チャット、手元の確認の回数です。人のレビュー以外の支援があった合格は「支援付き」になります。
      </p>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : !records ? (
        <p className="text-sm text-ink-3 mt-2">読み込んでいます</p>
      ) : records.length === 0 ? (
        <p className="text-sm text-ink-3 mt-2">まだ記録がありません</p>
      ) : (
        <ul className="mt-2 space-y-3">
          {records.map((r) => (
            <li key={r.taskId}>
              <div className="text-sm font-medium">{r.title}</div>
              <div className="text-xs text-ink-3">{r.stageTitle}</div>
              <TaskSupportSummary record={r} />
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}
