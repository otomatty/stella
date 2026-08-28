/**
 * スキルツリー — 星座として見る学習の全体像 (Phase 3a → 同心円 + キャンバス化)。
 *
 * ホームの「スキルマップ」が 1 本の縦線で「今どこか」を見せるのに対し、こちらは
 * **俯瞰**。星 = ステージ (教材) で、クリアした星が灯り、前提が線で繋がる。
 * 配置は同心円 (`radial-layout.ts`): 中心が入口の星、前提を進むほど外のリングへ
 * 広がる。盤面は `SkillTreeCanvas` の上にあり、Miro のようにドラッグで動かし、
 * ホイール / ピンチで拡縮できる。
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
 * `tabindex` を付けるより素直で、Popover のアンカーにもそのまま使える)。前提の線と
 * リングのガイドだけを背後の SVG に敷き、座標は `radial-layout.ts` の決定的な計算に
 * 任せる。
 *
 * ## 解放の演出は差分で 1 回だけ
 *
 * 「前回見たときは閉じていた星が開いた」「無かった星が現れた (教材の公開)」を
 * `celebration.ts` が localStorage の前回スナップショットとの差分で検出し、その星に
 * 1 回だけアニメーションを付ける (`index.css` の `tree-*`)。reduced-motion では
 * すべて止まる。
 */

import { useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, Lock, Play, Plus, Sparkles, Star } from "@/lib/icons";
import type { SkillMapStageNode } from "@/lib/skill-map-api";
import { cn } from "@/lib/utils";

import { useSkillTreeCelebration, type CelebrationKind } from "./celebration";
import { layoutRadialSkillTree, type RadialNode } from "./radial-layout";
import { SkillTreeCanvas, type SkillTreeCanvasHandle } from "./SkillTreeCanvas";

interface SkillTreeProps {
  nodes: SkillMapStageNode[];
  /** 演出のスナップショットを本人ごとに分けるためのキー。 */
  currentUserId: string | null;
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
  currentUserId,
  activeStageId,
  queuedStageIds,
  onStartStage,
  onQueueStage,
  onSkillCheck,
  className,
}: SkillTreeProps) => {
  // 座標は星の集合が変わったときだけ計算し直す (ポップオーバーの開閉で組み直さない)。
  const layout = useMemo(() => layoutRadialSkillTree(nodes), [nodes]);
  const celebrations = useSkillTreeCelebration(currentUserId, nodes);
  const canvasRef = useRef<SkillTreeCanvasHandle | null>(null);
  /** 演出の順番 (複数の星が同時に開いたとき、内側から順に灯す)。 */
  const celebrationOrder = useMemo(() => {
    const order = new Map<string, number>();
    for (const placed of layout.nodes) {
      if (celebrations.has(placed.node.id)) order.set(placed.node.id, order.size);
    }
    return order;
  }, [layout, celebrations]);

  if (nodes.length === 0) {
    return (
      <div className={cn("px-4 py-10 text-center text-[12.5px] text-ink-3", className)}>
        まだスキルがありません。教材が公開されると、ここに現れます。
      </div>
    );
  }

  return (
    <SkillTreeCanvas
      worldWidth={layout.width}
      worldHeight={layout.height}
      contentBounds={layout.bounds}
      handleRef={canvasRef}
      className={className}
    >
      <svg
        className="absolute inset-0"
        width={layout.width}
        height={layout.height}
        aria-hidden="true"
      >
        <title>前提のつながり</title>
        {/* 同心円のガイド。進むほど外へ、という盤面の向きを線で示す。 */}
        {layout.rings.map((ring) => (
          <circle
            key={ring.ring}
            cx={layout.centerX}
            cy={layout.centerY}
            r={ring.radius}
            fill="none"
            stroke="var(--line)"
            strokeWidth={1}
            strokeDasharray="3 7"
          />
        ))}
        {layout.edges.map((edge) => (
          <line
            key={`${edge.fromId}-${edge.toId}`}
            x1={edge.x1}
            y1={edge.y1}
            x2={edge.x2}
            y2={edge.y2}
            // 充足済み = 実線のブランド色 / 未充足 = 破線の薄い線。
            stroke={edge.satisfied ? "var(--brand)" : "var(--line-strong)"}
            strokeWidth={edge.satisfied ? 2 : 1}
            strokeDasharray={edge.satisfied ? undefined : "4 4"}
            opacity={edge.satisfied ? 0.9 : 0.55}
          />
        ))}
      </svg>

      {/* 扇の見出し (カテゴリ名)。線と星の下に敷いて、位置の手がかりだけにする。 */}
      {layout.sectors.map((sector) => (
        <div
          key={sector.key}
          className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[11px] font-semibold text-ink-4"
          style={{ left: sector.labelX, top: sector.labelY }}
        >
          {sector.key}
        </div>
      ))}

      {layout.nodes.map((placed) => (
        <StarNode
          key={placed.node.id}
          placed={placed}
          isActive={placed.node.id === activeStageId}
          queued={queuedStageIds.includes(placed.node.id)}
          celebration={celebrations.get(placed.node.id)}
          celebrationIndex={celebrationOrder.get(placed.node.id) ?? 0}
          onStartStage={onStartStage}
          onQueueStage={onQueueStage}
          onSkillCheck={onSkillCheck}
        />
      ))}
    </SkillTreeCanvas>
  );
};

interface StarNodeProps {
  placed: RadialNode;
  isActive: boolean;
  queued: boolean;
  /** 差分で検出した演出 (「解放」/「出現」)。undefined なら演出なし。 */
  celebration: CelebrationKind | undefined;
  /** 複数の演出を内側から順に灯すための順番。 */
  celebrationIndex: number;
  onStartStage: (stageId: string) => void;
  onQueueStage: (stageId: string) => void;
  onSkillCheck: (stageId: string) => void;
}

const StarNode = ({
  placed,
  isActive,
  queued,
  celebration,
  celebrationIndex,
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
  const isCenter = placed.ring === 0;

  /** 読み上げ用の状態語。見た目 (色・形) だけで区別させない。 */
  const stateText = fog
    ? "まだ見えない"
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
          aria-label={`${label}（${stateText}${celebration === "unlocked" ? "・新しく解放" : celebration === "appeared" ? "・新しく登場" : ""}）`}
          // フォーカス追従 (SkillTreeCanvas の onFocusCapture) 用の盤面座標。
          data-tree-x={placed.x}
          data-tree-y={placed.y}
          className={cn(
            "absolute flex w-[120px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 rounded-md p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            celebration === "appeared" ? "tree-appear" : "",
          )}
          style={{ left: placed.x, top: placed.y, "--d": celebrationIndex * 0.2 } as CSSProperties}
        >
          <span className="relative" aria-hidden="true">
            {/* 解放の瞬間: 広がる輪 2 本 + 星の弾み。1 回きり (celebration は差分でしか立たない)。 */}
            {celebration === "unlocked" ? (
              <>
                <span className="tree-burst" />
                <span className="tree-burst tree-burst-late" />
              </>
            ) : null}
            <span
              className={cn(
                "grid place-items-center rounded-full border transition-colors",
                isCenter ? "h-12 w-12" : "h-9 w-9",
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
                celebration === "unlocked" ? "tree-unlock-pop" : "",
              )}
            >
              {cleared ? (
                <Star size={isCenter ? 20 : 16} fill="currentColor" />
              ) : isActive ? (
                <Play size={isCenter ? 18 : 14} />
              ) : locked ? (
                <Lock size={isCenter ? 16 : 13} />
              ) : (
                <Sparkles size={isCenter ? 18 : 14} />
              )}
            </span>
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
          {celebration ? (
            <span className="tree-new-badge" aria-hidden="true">
              {celebration === "unlocked" ? "解放!" : "NEW"}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>

      <PopoverContent align="center" side="right" className="w-[280px]">
        <div className="text-[13px] font-semibold leading-snug">{fog ? "？？？" : label}</div>
        <div className="mt-0.5 text-[11px] text-ink-3">{stateText}</div>

        {fog ? (
          <p className="mt-2 text-[12px] text-ink-3">
            まだ先のスキルです。{node.theme ? `${node.theme} のあたりにあります。` : ""}
            手前のスキルを進めると見えてきます。
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
            このスキルを身につけた人は <strong className="text-ink-2">{node.can_do}</strong>。
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
                このスキルは修了済み
              </span>
            ) : null}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
