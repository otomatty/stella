import { useCallback, useEffect, useRef, useState } from "react";
import type { LearningPace } from "@stella/shared/study/pace";
import { apiFetch } from "@/lib/api-client";
import { subscribeProgressSynced } from "@/lib/lesson-progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const hours = (minutes: number) =>
  (minutes / 60).toLocaleString("ja-JP", { maximumFractionDigits: 1 });
const date = (value: string | null) => value?.replaceAll("-", "/") ?? "開始後に計算";

export function LearningPacePanel({
  userId,
  onSaved,
  revision = 0,
}: {
  userId?: string;
  onSaved?: () => Promise<void>;
  revision?: number;
}) {
  const [pace, setPace] = useState<LearningPace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [weeklyHours, setWeeklyHours] = useState("35");
  const [startDate, setStartDate] = useState("");
  const requestId = useRef(0);
  const inputsInitialized = useRef(false);
  const previousRevision = useRef(revision);
  const lifetime = useRef<AbortController | null>(null);
  const refresh = useCallback(
    async (signal?: AbortSignal, syncInputs = true) => {
      const id = ++requestId.current;
      try {
        const result = await apiFetch<{ pace: LearningPace }>(
          `/api/learning-pace${userId ? `?userId=${encodeURIComponent(userId)}` : ""}`,
          { signal },
        );
        if (signal?.aborted || id !== requestId.current) return;
        setPace(result.pace);
        if (syncInputs || !inputsInitialized.current) {
          setWeeklyHours(String(result.pace.settings.weeklyHours));
          setStartDate(result.pace.settings.startDate ?? "");
          inputsInitialized.current = true;
        }
        setError(null);
      } catch (err) {
        if (!signal?.aborted && id === requestId.current)
          setError(err instanceof Error ? err.message : "学習ペースを取得できませんでした");
      }
    },
    [userId],
  );
  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    void refresh(controller.signal);
    const onFocus = () => void refresh(controller.signal, false);
    window.addEventListener("focus", onFocus);
    const unsubscribe = userId ? undefined : subscribeProgressSynced(onFocus);
    return () => {
      controller.abort();
      window.removeEventListener("focus", onFocus);
      unsubscribe?.();
    };
  }, [refresh, userId]);
  useEffect(() => {
    if (previousRevision.current === revision) return;
    previousRevision.current = revision;
    void refresh(lifetime.current?.signal, false);
  }, [revision, refresh]);
  const save = async () => {
    setSaving(true);
    try {
      await apiFetch(userId ? `/api/learning-pace/${encodeURIComponent(userId)}` : "/api/me", {
        method: userId ? "PATCH" : "POST",
        body: { weekly_hours: Number(weeklyHours), learning_start_date: startDate || null },
      });
      await refresh(lifetime.current?.signal);
      await onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "学習設定を保存できませんでした");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Card className="mb-5">
      <CardHeader>
        <CardTitle>学習のペース</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {!pace && !error ? <p className="text-sm text-ink-3">予定を計算しています…</p> : null}
        {pace ? (
          <>
            <p className="text-sm text-ink-2">
              週{pace.settings.weeklyHours}時間 · 開始{" "}
              {pace.settings.startDate ? date(pace.settings.startDate) : "未開始"} · 全体の目標{" "}
              {date(pace.finishDate)}
            </p>
            <p className="text-sm">
              進んだ予定時間 {hours(pace.completedMinutes)} / {hours(pace.totalMinutes)}時間
              {pace.settings.startDate && pace.settings.startDate <= pace.today ? (
                <>
                  {" "}
                  · 目安との差 {pace.differenceMinutes >= 0 ? "+" : "−"}
                  {hours(Math.abs(pace.differenceMinutes))}時間
                </>
              ) : null}
              {pace.skippedPracticeMinutes > 0 ? (
                <> · 開始診断で練習を{hours(pace.skippedPracticeMinutes)}時間短縮</>
              ) : null}
            </p>
            <p className="text-xs text-ink-3">
              費やした時間ではなく、完了・合格した内容の予定時間で比べます。残りは今のペースで引き直し、補習の2〜4週間は別枠で確保します。
            </p>
            {pace.needsInstructor ? (
              <p className="text-sm text-ink-2">
                目安との差が1週間を超えています。担当講師と週の時間や支援を相談できます。
              </p>
            ) : null}
            {!pace.settings.startDate ? (
              <p className="text-sm text-ink-2">
                最初のステージを始めると開始日が入ります。開始日を指定することもできます。
              </p>
            ) : null}
            <div>
              <h3 className="text-sm font-semibold mb-2">
                今週の目安 ({date(pace.weekStart)}〜{date(pace.weekEnd)})
              </h3>
              {pace.thisWeek.length ? (
                <ul className="space-y-2 text-sm">
                  {pace.thisWeek.map((u) => (
                    <li key={u.unitId}>
                      <span className="font-medium">{u.title}</span> · {hours(u.minutes)}時間 · 約
                      {u.sessions}コマ (1コマ60〜90分)
                      {u.lessons.length ? (
                        <p className="text-xs text-ink-3 mt-1">
                          {u.lessons.map((l) => l.title).join(" / ")}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-3">
                  今週の単元は、開始日と公開済みの教材から計算します。
                </p>
              )}
            </div>
            {pace.assessments.length ? (
              <div>
                <h3 className="text-sm font-semibold mb-2">確認Bの予定</h3>
                <ul className="space-y-1 text-sm">
                  {pace.assessments.map((a) => (
                    <li key={a.taskId}>
                      {date(a.dueDate)} · {a.title}
                      {a.dueDate < pace.today ? " · 取り組めるときに確認しましょう" : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <details>
              <summary className="cursor-pointer text-sm font-semibold">各ステージの目標日</summary>
              <ul className="mt-2 space-y-1 text-sm">
                {pace.targets.map((t) => (
                  <li key={t.stageId}>
                    {t.title} · {t.remainingMinutes === 0 ? "完了" : date(t.targetDate)}
                  </li>
                ))}
              </ul>
            </details>
            {pace.incomplete ? (
              <p className="text-xs text-ink-3">
                準備中の教材があります。全体の目標は講座の予定時間を含み、今週のコマは用意できた単元だけを表示します。
              </p>
            ) : null}
            <details>
              <summary className="cursor-pointer text-sm font-semibold">ペースを変更する</summary>
              <form
                className="mt-3 flex flex-wrap items-end gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void save();
                }}
              >
                <div className="space-y-1">
                  <Label htmlFor={`pace-hours-${userId ?? "me"}`}>週の学習時間</Label>
                  <Input
                    id={`pace-hours-${userId ?? "me"}`}
                    type="number"
                    min={1}
                    max={80}
                    step="any"
                    required
                    value={weeklyHours}
                    onChange={(e) => setWeeklyHours(e.target.value)}
                    className="w-28"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`pace-start-${userId ?? "me"}`}>開始日</Label>
                  <Input
                    id={`pace-start-${userId ?? "me"}`}
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={saving}>
                  {saving ? "保存中…" : "保存して計算し直す"}
                </Button>
                <p className="w-full text-xs text-ink-3">
                  開始日を空欄で保存すると、最初のステージを始めた日に戻します。
                </p>
              </form>
            </details>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
