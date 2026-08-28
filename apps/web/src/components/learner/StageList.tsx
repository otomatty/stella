import { useState } from "react";
import { Video, Clock, Plus, Check, Play } from "@/lib/icons";
import { PageHeader } from "@/components/common/PageHeader";
import { StageThumb } from "@/components/common/StageThumb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useSkillMap, useStageQueue } from "@/hooks/useSkillMap";
import type { Stage } from "@/data/types";
import { cn } from "@/lib/utils";

interface StageListProps {
  setPage: (page: string) => void;
  stages: Stage[];
  setCurrentStage: (c: Stage) => void;
  /** 「次にやるリスト」の読み書きに使う (未ログイン / デモでは無効)。 */
  currentUserId: string | null;
  backendEnabled: boolean;
}

type Filter = "all" | "active" | "new" | "done";

export const StageList = ({
  setPage,
  stages,
  setCurrentStage,
  currentUserId,
  backendEnabled,
}: StageListProps) => {
  const [filter, setFilter] = useState<Filter>("all");
  // カードの既定アクションを「キューに追加」にするため、いま進めている星と
  // 積んであるリストを引く (ホームと同じ API)。HUD はこの画面に無いので
  // スキルプロフィール (XP / レベル) は取らない。
  const skillMap = useSkillMap(currentUserId, backendEnabled, { withProfile: false });
  const queue = useStageQueue(currentUserId, backendEnabled);
  const activeStageId = skillMap.map?.active_stage_id ?? null;

  const shown = stages.filter((c) => {
    if (filter === "all") return true;
    if (filter === "active") return !c.completed && c.progress > 0;
    if (filter === "done") return Boolean(c.completed);
    if (filter === "new") return c.progress === 0;
    return true;
  });

  const tabs: Array<{ id: Filter; label: string; n: number }> = [
    { id: "all", label: "すべて", n: stages.length },
    {
      id: "active",
      label: "受講中",
      n: stages.filter((c) => !c.completed && c.progress > 0).length,
    },
    { id: "new", label: "未着手", n: stages.filter((c) => c.progress === 0).length },
    { id: "done", label: "完了", n: stages.filter((c) => c.completed).length },
  ];

  const openStage = (c: Stage) => {
    setCurrentStage(c);
    setPage("stage-detail");
  };

  return (
    <>
      {/*
        ヘッダにあった「フィルター」「ステージを探す」は撤去した (Issue #77)。
        前者は直下の絞り込みタブと重複、 後者は受講登録が管理者割当のみで
        自分でステージを追加する導線が存在しないため。
      */}
      <PageHeader title="ステージ一覧" sub="受講中・完了・未着手のステージを確認できます" />

      <div className="flex gap-1 items-center mb-6 pb-3 border-b border-border">
        {tabs.map((t) => (
          <Button
            key={t.id}
            size="sm"
            variant={filter === t.id ? "primary" : "ghost"}
            onClick={() => setFilter(t.id)}
          >
            {t.label}
            <span className="opacity-70 ml-1">{t.n}</span>
          </Button>
        ))}
      </div>

      {queue.error ? (
        <p className="text-sm text-destructive mb-3">
          次にやるリストの更新に失敗しました: {queue.error}
        </p>
      ) : null}

      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
      >
        {shown.map((c) => {
          const isActive = c.id === activeStageId;
          const queued = queue.queue.includes(c.id);
          return (
            <div
              key={c.id}
              className={cn(
                "bg-card border rounded-lg overflow-hidden flex flex-col",
                isActive ? "border-brand" : "border-border",
              )}
            >
              {/* カード面はステージ詳細への導線 (従来どおり)。 */}
              <button
                type="button"
                onClick={() => openStage(c)}
                className="text-left cursor-pointer transition-colors hover:bg-sunken"
              >
                <StageThumb color={c.color} label={c.category} thumbnailPath={c.thumbnailPath} />
                <div className="p-4 flex flex-col gap-2">
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {isActive ? (
                      <Badge variant="accent">進行中</Badge>
                    ) : c.completed ? (
                      <Badge variant="success">完了</Badge>
                    ) : c.progress > 0 ? (
                      <Badge variant="accent">受講中</Badge>
                    ) : (
                      <Badge>未着手</Badge>
                    )}
                    {c.required === true ? (
                      <Badge variant="warning">必須</Badge>
                    ) : c.required === false ? (
                      <Badge variant="info">任意</Badge>
                    ) : null}
                    <span className="text-[11.5px] text-ink-3">{c.category}</span>
                  </div>
                  <div className="text-[15px] font-semibold leading-snug tracking-tight">
                    {c.title}
                  </div>
                  <div className="text-[11.5px] text-ink-3 flex gap-3 items-center">
                    <span className="flex items-center gap-1">
                      <Video size={11} /> {c.lessonsCount}レッスン
                    </span>
                    <span className="w-[3px] h-[3px] rounded-full bg-ink-4" />
                    <span className="flex items-center gap-1">
                      <Clock size={11} /> 約{c.duration ?? 20}時間
                    </span>
                  </div>
                  <Progress value={c.progress} tone="brand" className="mt-2" />
                  <div className="flex items-center justify-between text-xs text-ink-3">
                    <span>
                      {c.progress === 0
                        ? "未着手"
                        : c.completed
                          ? "修了済み"
                          : `${c.progress}% 完了`}
                    </span>
                    {c.dueAt && !c.completed ? (
                      <span className="text-[11.5px] text-ink-3">期限 {c.dueAt.slice(5)}</span>
                    ) : null}
                  </div>
                </div>
              </button>

              {/*
                既定アクションは「キューに追加」。同時に進めるのは 1 ステージだけ、という
                設計なので、一覧から直接乗り換えさせず「次にやるリスト」へ積む導線にする
                (乗り換えはホームの道で、一時停止の確認を挟んで行う)。
              */}
              <div className="mt-auto flex items-center gap-2 border-t border-border px-4 py-2.5">
                {isActive ? (
                  <span className="text-[11.5px] text-brand-ink flex items-center gap-1">
                    <Play size={11} />
                    いま進めています
                  </span>
                ) : c.completed ? (
                  <span className="text-[11.5px] text-ink-3">修了済み</span>
                ) : !backendEnabled ? (
                  <span className="text-[11.5px] text-ink-3">　</span>
                ) : queued ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    // 失敗は Hook が `queue.error` に積む (上に出している)。ここでは
                    // 未処理の rejection を残さないためだけに受ける。
                    onClick={() => queue.remove(c.id).catch(() => undefined)}
                    aria-label={`${c.title} をキューから外す`}
                  >
                    <Check size={12} />
                    キュー済み
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => queue.add(c.id).catch(() => undefined)}
                  >
                    <Plus size={12} />
                    キューに追加
                  </Button>
                )}
                <div className="flex-1" />
                <Button size="sm" variant="ghost" onClick={() => openStage(c)}>
                  詳細
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};
