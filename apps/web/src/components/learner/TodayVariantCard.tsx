/**
 * 毎日の復習画面の「今日の類題」(#39・07 §7.2)。
 *
 * 知識は SRS のカードで復習し、コードは同じ実装パターンの別の問題 (類題) を時間を空けて 1 問出す。
 * 類題は課題と同じく「VS Code で開く」から解き、手元で実行 → 提出 → AI の一次レビューへ進む。
 * 今日の類題が無い・取得に失敗したときは何も出さない (知識の復習の邪魔をしない)。
 */

import { useEffect, useState } from "react";

import { TASK_STATUS_LABELS, type TaskStatus } from "@stella/shared/tasks/catalog";
import { TASK_KIND_LABELS } from "@stella/shared/tasks/manifest";
import { type TodayVariantReview, VARIANT_PURPOSE_LABELS } from "@stella/shared/tasks/variants";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getTodayVariant } from "@/lib/srs-api";
import { OpenInVscodeButton } from "./OpenInVscodeButton";

const PASSED: readonly TaskStatus[] = ["passed", "ai-passed"];

export function TodayVariantCard({ enabled }: { enabled: boolean }) {
  const [variant, setVariant] = useState<TodayVariantReview | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void getTodayVariant()
      .then((v) => {
        if (!cancelled) setVariant(v);
      })
      .catch(() => {
        // 類題を引けなくても知識の復習は続けられる。枠を出さないだけにする。
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);
  if (!variant) return null;
  const passed = PASSED.includes(variant.status);
  return (
    <Card className="mb-4" aria-label="今日の類題">
      <CardContent>
        <div className="flex flex-wrap items-center gap-3 py-1">
          <div className="flex-1 min-w-48">
            <p className="text-xs text-ink-3">
              今日の類題 · {VARIANT_PURPOSE_LABELS[variant.purpose]}
            </p>
            <h2 className="text-sm font-medium mt-1">{variant.title}</h2>
            <p className="text-xs text-ink-3 mt-1">
              {TASK_KIND_LABELS[variant.kind]} · 前に解いた問題と同じ考え方で、別の問題を解きます
            </p>
          </div>
          <Badge variant={passed ? "success" : "default"}>
            {TASK_STATUS_LABELS[variant.status]}
          </Badge>
          {passed ? null : <OpenInVscodeButton taskId={variant.taskId} />}
        </div>
      </CardContent>
    </Card>
  );
}
