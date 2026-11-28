import type { GroupReflections as ReflectionPage } from "@stella/shared/groups/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Notice } from "@/components/common/Notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { type GroupRequest, setReflectionHidden } from "@/lib/admin-groups-api";
import { GroupTime } from "./group-display";

type Reflection = ReflectionPage["reflections"][number];

export function GroupReflections({ request }: { request: GroupRequest }) {
  const [page, setPage] = useState<ReflectionPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const active = useRef<AbortController | null>(null);

  const load = useCallback(
    async (cursor?: string) => {
      if (active.current) return;
      const controller = new AbortController();
      active.current = controller;
      setLoading(true);
      setError(false);
      try {
        const query = cursor ? `?${new URLSearchParams({ cursor })}` : "";
        const next = await request<ReflectionPage>(`/reflections${query}`, {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setPage((previous) =>
          cursor && previous
            ? { ...next, reflections: [...previous.reflections, ...next.reflections] }
            : next,
        );
      } catch {
        if (!controller.signal.aborted) setError(true);
      } finally {
        if (!controller.signal.aborted) {
          active.current = null;
          setLoading(false);
        }
      }
    },
    [request],
  );

  useEffect(() => {
    void load();
    return () => {
      active.current?.abort();
      active.current = null;
    };
  }, [load]);

  function applyHidden(submissionId: string, hidden: boolean) {
    setPage(
      (previous) =>
        previous && {
          ...previous,
          reflections: previous.reflections.map((row) =>
            row.submissionId === submissionId ? { ...row, hidden } : row,
          ),
        },
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        {loading && (
          <p role="status" className="text-sm text-ink-2">
            振り返りを読み込んでいます…
          </p>
        )}
        {error && <Notice role="alert">振り返りを取得できませんでした。</Notice>}
        {page?.reflections.length === 0 && (
          <p className="text-sm text-ink-2">共有された振り返りはありません。</p>
        )}
        {!!page?.reflections.length && (
          <ul className="divide-y divide-border">
            {page.reflections.map((row) => (
              <ReflectionRow key={row.submissionId} row={row} onChange={applyHidden} />
            ))}
          </ul>
        )}
        {page?.nextCursor && (
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => void load(page.nextCursor ?? undefined)}
          >
            もっと見る
          </Button>
        )}
        {error && !page && (
          <Button type="button" onClick={() => void load()}>
            再読み込み
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function ReflectionRow({
  row,
  onChange,
}: {
  row: Reflection;
  onChange: (id: string, hidden: boolean) => void;
}) {
  const [saving, setSaving] = useState(false);

  async function toggleHidden() {
    const hidden = !row.hidden;
    setSaving(true);
    try {
      await setReflectionHidden(row.submissionId, hidden);
      onChange(row.submissionId, hidden);
    } catch {
      toast.error("振り返りの表示を更新できませんでした");
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="space-y-2 py-3 [overflow-wrap:anywhere]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-1">
          <p className="text-sm font-semibold">{row.name}</p>
          <p className="text-sm text-ink-2">
            {row.stageTitle} / {row.taskTitle}
          </p>
          <p className="text-xs text-ink-3">
            <GroupTime value={new Date(row.submittedAt).toISOString()} />
          </p>
        </div>
        <div className="flex items-center gap-2">
          {row.hidden && <Badge>非表示</Badge>}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={saving}
            onClick={() => void toggleHidden()}
          >
            {row.hidden ? "表示に戻す" : "隠す"}
          </Button>
        </div>
      </div>
      <blockquote className="border-l-2 border-border pl-3 text-sm whitespace-pre-wrap">
        {row.reflection}
      </blockquote>
    </li>
  );
}
