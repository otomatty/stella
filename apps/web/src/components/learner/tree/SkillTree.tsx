/**
 * スキルツリー — 星座として見る学習の全体像 (Phase 3a)。
 *
 * ホームの「ステージの道」が 1 本の縦線で「今どこか」を見せるのに対し、こちらは
 * **俯瞰**。星 = ステージ (教材) で、クリアした星が灯り、前提が線で繋がる。
 *
 * ## クライアントで秘匿を再実装しない
 *
 * 何をどこまで見せるかは `GET /api/skill-map/mine` が決めていて、霧の星の応答には
 * タイトルも slug も前提の線も入っていない。ここは受け取った `state` × `visibility`
 * を見た目に写すだけ (「locked だから隠す」をこちらで足すと秘匿が二重管理になる)。
 *
 * ## 線は SVG・星は button
 *
 * 星は `<button>` にして、キーボードでも到達できるようにする (SVG の図形に
 * `tabindex` を付けるより素直で、Popover のアンカーにもそのまま使える)。前提の線だけ
 * を背後の SVG に敷き、座標は `layout.ts` の決定的な計算に任せる。
 */

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, Lock, Play, Plus, Sparkles, Star } from "@/lib/icons";
import type { SkillMapStageNode } from "@/lib/skill-map-api";
import { cn } from "@/lib/utils";

import { layoutSkillTree, type TreeNode } from "./layout";

interface SkillTreeProps {
  nodes: SkillMapStageNode[];
  activeStageId: string | null;
  /** 既に「次にやるリスト」に積んである星。 */
  queuedStageIds: string[];
  /** 「ここから始める」(いま進める星に切り替える)。 */
  onStartStage: (stageId: string) => void;
  /** 「キューに追加」。 */
  onQueueStage: (stageId: string) => void;
  /** 腕試しを開く。 */
  onSkillCheck: (stageId: string) => void;
  className?: string;
}

/** 霧の外はタイトル、霧の中はテーマ名 (サーバが既に伏せてある値をそのまま出す)。 */
function labelOf(node: SkillMapStageNode): string {
  return node.title ?? node.theme ?? "？？？";
}

export const SkillTree = ({
  nodes,
  activeStageId,
  queuedStageIds,
  onStartStage,
  onQueueStage,
  onSkillCheck,
  className,
}: SkillTreeProps) => {
  // 座標は星の集合が変わったときだけ計算し直す (ポップオーバーの開閉で組み直さない)。
  const layout = useMemo(() => layoutSkillTree(nodes), [nodes]);
  // 星の周りに置くラベルぶんの余白。星の中心座標に足して使う。
  const padX = 80;
  const padY = 56;

  if (nodes.length === 0) {
    return (
      <div className={cn("px-4 py-10 text-center text-[12.5px] text-ink-3", className)}>
        まだ星がありません。教材が公開されると、ここに現れます。
      </div>
    );
  }

  return (
    // 星が増えると横に伸びるので、はみ出しはこの箱の中だけで横スクロールさせる。
    <div className={cn("overflow-x-auto", className)}>
      {/* `mx-auto` は使わない。星が箱より広いとき、左右に振り分けられた余白の左半分が
          スクロール範囲の外に出て **左端の星に届かなくなる**。`w-max` の内容箱を
          左詰めで置き、狭いときの中央寄せは親 (`justify-center` 相当) には頼らず
          諦める — 届かない星を作らない方を採る。 */}
      <div
        className="relative w-max"
        style={{ width: layout.width + padX * 2, height: layout.height + padY * 2 }}
      >
        <svg
          className="absolute inset-0"
          width={layout.width + padX * 2}
          height={layout.height + padY * 2}
          aria-hidden="true"
        >
          <title>前提のつながり</title>
          {layout.edges.map((edge) => (
            <line
              key={`${edge.fromId}-${edge.toId}`}
              x1={edge.x1 + padX}
              y1={edge.y1 + padY}
              x2={edge.x2 + padX}
              y2={edge.y2 + padY}
              // 充足済み = 実線のブランド色 / 未充足 = 破線の薄い線。
              stroke={edge.satisfied ? "var(--brand)" : "var(--line-strong)"}
              strokeWidth={edge.satisfied ? 2 : 1}
              strokeDasharray={edge.satisfied ? undefined : "4 4"}
              opacity={edge.satisfied ? 0.9 : 0.55}
            />
          ))}
        </svg>

        {/* 列見出し (カテゴリ名)。線と星の下に敷いて、位置の手がかりだけにする。 */}
        {layout.columns.map((column) => (
          <div
            key={column.key}
            className="absolute -translate-x-1/2 text-[11px] font-semibold text-ink-4"
            style={{ left: column.x + padX, top: 8 }}
          >
            {column.key}
          </div>
        ))}

        {layout.nodes.map((placed) => (
          <StarNode
            key={placed.node.id}
            placed={placed}
            left={placed.x + padX}
            top={placed.y + padY}
            isActive={placed.node.id === activeStageId}
            queued={queuedStageIds.includes(placed.node.id)}
            onStartStage={onStartStage}
            onQueueStage={onQueueStage}
            onSkillCheck={onSkillCheck}
          />
        ))}
      </div>
    </div>
  );
};

interface StarNodeProps {
  placed: TreeNode;
  left: number;
  top: number;
  isActive: boolean;
  queued: boolean;
  onStartStage: (stageId: string) => void;
  onQueueStage: (stageId: string) => void;
  onSkillCheck: (stageId: string) => void;
}

const StarNode = ({
  placed,
  left,
  top,
  isActive,
  queued,
  onStartStage,
  onQueueStage,
  onSkillCheck,
}: StarNodeProps) => {
  const [open, setOpen] = useState(false);
  const node = placed.node;
  const fog = node.visibility === "fog";
  const cleared = node.state === "cleared";
  const locked = node.state === "locked";
  const label = labelOf(node);

  /** 読み上げ用の状態語。見た目 (色・形) だけで区別させない。 */
  const stateText = fog
    ? "まだ霧の中"
    : cleared
      ? "クリア済み"
      : isActive
        ? "進行中"
        : locked
          ? "未解放"
          : "解放済み";

  const act = (run: () => void) => {
    setOpen(false);
    run();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${label}（${stateText}）`}
          className="absolute flex w-[120px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 rounded-md p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={{ left, top }}
        >
          <span
            className={cn(
              "grid h-9 w-9 place-items-center rounded-full border transition-colors",
              cleared
                ? "sf-gradient-bg border-transparent text-brand-foreground"
                : isActive
                  ? "border-brand bg-card text-brand"
                  : node.state === "unlocked"
                    ? "border-border-strong bg-card text-ink-2"
                    : "border-dashed border-border-strong bg-sunken text-ink-4",
              // 現在地だけ脈動させる。reduced-motion では止める。
              isActive ? "animate-pulse motion-reduce:animate-none" : "",
              fog ? "opacity-50" : "",
            )}
            aria-hidden="true"
          >
            {cleared ? (
              <Star size={16} fill="currentColor" />
            ) : isActive ? (
              <Play size={14} />
            ) : locked ? (
              <Lock size={13} />
            ) : (
              <Sparkles size={14} />
            )}
          </span>
          <span
            className={cn(
              "text-center text-[11px] leading-tight",
              isActive ? "font-semibold text-ink" : "text-ink-2",
              // 霧の星は名前を持たない。ぼかして「まだ知らない」ことを見せる。
              fog ? "text-ink-4 blur-[1.5px] select-none" : "",
            )}
          >
            {label}
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent align="center" side="right" className="w-[280px]">
        <div className="text-[13px] font-semibold leading-snug">{fog ? "？？？" : label}</div>
        <div className="mt-0.5 text-[11px] text-ink-3">{stateText}</div>

        {fog ? (
          <p className="mt-2 text-[12px] text-ink-3">
            まだ霧の中です。{node.theme ? `${node.theme} のあたりに星があります。` : ""}
            手前の星を進めると見えてきます。
          </p>
        ) : locked ? (
          // ロック星に出してよいのは解放条件だけ (到達説明はそもそも届いていない)。
          <div className="mt-2 text-[12px] text-ink-3">
            <div className="font-semibold text-ink-2">解放条件</div>
            <div className="mt-0.5">
              {(node.lock_reasons ?? []).length > 0
                ? `${(node.lock_reasons ?? []).join(" / ")} をクリアすると開きます`
                : "前提のステージをクリアすると開きます"}
            </div>
          </div>
        ) : node.can_do ? (
          <p className="mt-2 text-[12px] text-ink-3">
            この星をともした人は <strong className="text-ink-2">{node.can_do}</strong>。
          </p>
        ) : null}

        {fog ? null : (
          <div className="mt-3 flex flex-wrap gap-2">
            {locked ? (
              <Button size="sm" variant="accent" onClick={() => act(() => onSkillCheck(node.id))}>
                <Sparkles size={12} />
                腕試しに挑戦（飛び級）
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => act(() => onSkillCheck(node.id))}>
                腕試しで力試し
              </Button>
            )}

            {/* 修了した星に着手の導線は出さない (サーバも切り替えを 400 で断る)。
                解放済みなら **割り当ての有無によらず** 始められる (Phase 3b) —
                受講登録は「ここから始める」を押した時点で自分で作る。
                キューだけは受講登録のある星に限る (キュー API が登録を要求するため)。 */}
            {!locked && !cleared && !isActive ? (
              <>
                <Button size="sm" onClick={() => act(() => onStartStage(node.id))}>
                  ここから始める
                </Button>
                {queued || !node.enrolled ? null : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => act(() => onQueueStage(node.id))}
                  >
                    <Plus size={12} />
                    キューに追加
                  </Button>
                )}
              </>
            ) : null}

            {cleared ? (
              <span className="inline-flex items-center gap-1 self-center text-[11.5px] text-ink-3">
                <Check size={12} />
                この星は点灯済み
              </span>
            ) : null}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
