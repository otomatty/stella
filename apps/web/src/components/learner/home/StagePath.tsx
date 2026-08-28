/**
 * ステージの道 — ホームの主役 (Phase 2)。
 *
 * 縦一本のパスで「下 = 通ってきた過去 / 真ん中 = 現在地 / 上 = これから」を描く。
 * 上へ行くほど情報が薄くなり、いちばん上は霧 (テーマ名だけ)。
 *
 * ## クライアントで秘匿を再実装しない
 *
 * 何をどこまで見せるかは `GET /api/skill-map/mine` が既に決めていて、霧の星の応答
 * には **タイトルも slug も入っていない**。ここは受け取った `state` × `visibility` を
 * 見た目に写すだけ。「locked だから隠す」といった判断をこちらで足すと、秘匿の規則が
 * 二重管理になり、どちらかが緩んだときに気付けない。
 *
 * ## 並び順
 *
 * 前提グラフの深さはサーバから来ないので、**状態と視界の段**で並べる
 * (`cleared → active → unlocked → locked → name-only → fog`)。同じ段の中はタイトル順で
 * 固定し、再取得のたびに星が入れ替わらないようにする。描画は上が未来なので逆順。
 */

import { Check, Lock, Play, Plus, Sparkles } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardActions } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { SkillMapStageNode } from "@/lib/skill-map-api";
import { cn } from "@/lib/utils";

/**
 * 発見教材 (✦) 1 つぶん (Phase 4)。
 *
 * **サーバが公開条件で絞ったあとの配列が渡ってくる** (承認済み × 源流ステージが
 * 進行中 / クリア済み)。ここでは「どの星の脇に置くか」だけを見て、見せてよいかの
 * 判断はしない — 秘匿の規則を画面側に二重実装しないため (上の道と同じ方針)。
 */
export interface DiscoveryMarker {
  id: string;
  /** 源流ステージ。この星の下に ✦ を並べる。 */
  stage_id: string;
  title: string;
  description: string;
  question_count: number;
  passed: boolean;
}

interface StagePathProps {
  nodes: SkillMapStageNode[];
  activeStageId: string | null;
  /** 現在地の星に出す「続きから」。次のレッスンが決まらないときは undefined。 */
  resume?: { lessonTitle: string; onResume: () => void } | undefined;
  /** 現在地の進捗率 (0-100)。 */
  activeProgress?: number;
  /** 星を「いま進める 1 つ」に切り替える (確認は呼び出し側が出す)。 */
  onStartStage: (stageId: string) => void;
  /** 「次にやるリスト」へ積む。 */
  onQueueStage: (stageId: string) => void;
  /** 既にキューにあるステージ id。 */
  queuedStageIds: string[];
  /**
   * サーバの現在地が自分のステージ一覧から引けないときの案内。
   *
   * 割当が外れた / 別テナントへ移った、といった稀な状態。適当な星に読み替えると
   * 「現在地」と「続きから」が食い違うので、現在地なしで描いたうえでフォーカスを
   * 外す導線だけ出す。
   */
  focusLost?: { onClear: () => void } | undefined;
  /** 発見教材 (Phase 4)。空なら描かない。 */
  discoveries?: DiscoveryMarker[];
  /** ✦ を押したとき (受験ダイアログを開く)。未指定なら押せない印だけを描く。 */
  onOpenDiscovery?: (discoveryId: string) => void;
  className?: string;
}

/** 段の並び (小さいほど過去 = 下)。 */
const RANK: Record<string, number> = {
  cleared: 0,
  active: 1,
  unlocked: 2,
  locked: 3,
};

function rankOf(node: SkillMapStageNode): number {
  if (node.visibility === "fog") return 5;
  if (node.visibility === "name-only") return 4;
  return RANK[node.state] ?? 3;
}

/** 霧の外はタイトル、霧の中はテーマ名 (サーバが既に伏せてある値をそのまま出す)。 */
function labelOf(node: SkillMapStageNode): string {
  return node.title ?? node.theme ?? "？？？";
}

export const StagePath = ({
  nodes,
  activeStageId,
  resume,
  activeProgress = 0,
  onStartStage,
  onQueueStage,
  queuedStageIds,
  focusLost,
  discoveries = [],
  onOpenDiscovery,
  className,
}: StagePathProps) => {
  // 下 = 過去。描画は上から (= 未来から) なので降順に並べる。
  const ordered = [...nodes].sort(
    (a, b) => rankOf(b) - rankOf(a) || labelOf(a).localeCompare(labelOf(b), "ja"),
  );
  const cleared = nodes.filter((n) => n.state === "cleared").length;
  /** 星ごとの ✦。源流の星がこの道に無い教材は描かない (置き場所が無い)。 */
  const discoveryByStage = new Map<string, DiscoveryMarker[]>();
  for (const d of discoveries) {
    discoveryByStage.set(d.stage_id, [...(discoveryByStage.get(d.stage_id) ?? []), d]);
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>ステージの道</CardTitle>
        <CardActions>
          <span className="text-[11.5px] text-ink-3">
            点灯 {cleared} / {nodes.length}
          </span>
        </CardActions>
      </CardHeader>

      {/*
        現在地を見失っているときの案内は道の外 (上) に出す。中に入れると背骨
        (絶対配置の縦線) の起点がずれる。
      */}
      {focusLost ? (
        <div className="mx-4 mt-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-warning-soft px-3 py-2">
          <span className="text-[11.5px] text-ink-2">
            進行中のステージが見つかりません。別のステージを選び直してください。
          </span>
          <Button size="sm" variant="ghost" onClick={focusLost.onClear}>
            フォーカスを外す
          </Button>
        </div>
      ) : null}

      {nodes.length === 0 ? (
        <div className="px-4 py-6 text-center text-[12.5px] text-ink-3">
          まだ道がありません。教材が公開されると、ここに星が現れます。
        </div>
      ) : (
        <div className="relative px-4 py-4">
          {/* 背骨。ノードの丸 (中心 x = 16px + 12px) に合わせる。 */}
          <div
            className="absolute left-[28px] top-6 bottom-6 w-px bg-border-strong"
            aria-hidden="true"
          />
          <ol className="relative flex flex-col gap-1">
            {ordered.map((node) => (
              <PathNode
                key={node.id}
                node={node}
                isActive={node.id === activeStageId}
                {...(node.id === activeStageId && resume ? { resume } : {})}
                activeProgress={activeProgress}
                onStartStage={onStartStage}
                onQueueStage={onQueueStage}
                queued={queuedStageIds.includes(node.id)}
                discoveries={discoveryByStage.get(node.id) ?? []}
                {...(onOpenDiscovery ? { onOpenDiscovery } : {})}
              />
            ))}
          </ol>
        </div>
      )}
    </Card>
  );
};

interface PathNodeProps {
  node: SkillMapStageNode;
  isActive: boolean;
  resume?: { lessonTitle: string; onResume: () => void };
  activeProgress: number;
  onStartStage: (stageId: string) => void;
  onQueueStage: (stageId: string) => void;
  queued: boolean;
  /** この星の脇に灯る発見教材 (Phase 4)。 */
  discoveries: DiscoveryMarker[];
  onOpenDiscovery?: (discoveryId: string) => void;
}

const PathNode = ({
  node,
  isActive,
  resume,
  activeProgress,
  onStartStage,
  onQueueStage,
  queued,
  discoveries,
  onOpenDiscovery,
}: PathNodeProps) => {
  const fog = node.visibility === "fog";
  const locked = node.state === "locked";
  const label = labelOf(node);

  return (
    <li className="relative flex items-start gap-3 py-2">
      <span
        className={cn(
          "relative z-10 mt-0.5 grid place-items-center w-6 h-6 rounded-full shrink-0 border",
          node.state === "cleared"
            ? "sf-gradient-bg border-transparent text-brand-foreground"
            : isActive
              ? "border-brand bg-card text-brand"
              : node.state === "unlocked"
                ? "border-border-strong bg-card text-ink-2"
                : "border-dashed border-border-strong bg-sunken text-ink-4",
          // 現在地だけ脈動させる。reduced-motion では止める (motion-reduce)。
          isActive ? "animate-pulse motion-reduce:animate-none" : "",
          fog ? "opacity-50" : "",
        )}
        aria-hidden="true"
      >
        {node.state === "cleared" ? (
          <Check size={13} />
        ) : locked ? (
          <Lock size={11} />
        ) : isActive ? (
          <Play size={11} />
        ) : (
          <Sparkles size={11} />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "text-[13px] leading-snug",
              isActive ? "font-semibold" : "",
              node.state === "cleared" ? "text-ink-2" : "",
              // 霧の星は名前を持たない。ぼかして「まだ知らない」ことを見せる。
              fog ? "text-ink-4 blur-[1.5px] select-none" : "",
            )}
          >
            {label}
          </span>
          {isActive ? (
            <span className="text-[10px] rounded-full bg-brand-soft text-brand-ink px-2 py-0.5">
              現在地
            </span>
          ) : null}
          {queued && !isActive ? (
            <span className="text-[10px] rounded-full border border-border px-2 py-0.5 text-ink-3">
              キュー済み
            </span>
          ) : null}
        </div>

        {/* 到達説明はサーバが「手の届く星」にだけ載せてくる。 */}
        {node.can_do && !isActive ? (
          <div className="text-[11.5px] text-ink-3 mt-0.5">{node.can_do}</div>
        ) : null}

        {isActive ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            <span className="text-[11.5px] text-ink-3">
              {resume ? resume.lessonTitle : "進捗 " + activeProgress + "%"}
            </span>
            {resume ? (
              <Button size="sm" variant="accent" onClick={resume.onResume}>
                <Play size={12} />
                続きから
              </Button>
            ) : null}
          </div>
        ) : null}

        {locked && node.lock_reasons && node.lock_reasons.length > 0 ? (
          <Tooltip>
            {/*
              トリガーは button。span のままだとフォーカスが当たらず、ポインタを
              持たない利用者に解放条件が読めない (sidebar-menu と同じ流儀)。
            */}
            <TooltipTrigger asChild>
              <button
                type="button"
                className="mt-0.5 inline-flex items-center gap-1 text-[11.5px] text-ink-3 cursor-help"
              >
                <Lock size={10} />
                解放条件あり
              </button>
            </TooltipTrigger>
            {/* ロック星に出してよいのは解放条件だけ (到達説明はそもそも届いていない)。 */}
            <TooltipContent side="right" className="max-w-[260px]">
              {node.lock_reasons.join(" / ")} をクリアすると開きます
            </TooltipContent>
          </Tooltip>
        ) : null}

        {/*
          「ここから始める」は **解放されている星なら誰でも押せる** (Phase 3b)。受講登録は
          押した時点で自分で作るので、割り当て済みかどうかで出し分けない。

          修了した星にアクションは出さない。サーバも クリア済みへの切り替えを 400 で
          断る (`PUT /api/skill-map/active-stage`) ので、押せるボタンを置くと
          必ず失敗する導線になる。

          キューは受講登録のある星だけ (`POST /api/stage-queue/mine` が登録を要求する)。
          まだ始めていない星は「ここから始める」が先で、始めた星が待ち行列に並ぶ。
        */}
        {!isActive && !locked && !fog && node.state !== "cleared" ? (
          <div className="mt-1.5 flex items-center gap-2">
            <Button size="sm" variant="default" onClick={() => onStartStage(node.id)}>
              ここから始める
            </Button>
            {queued || !node.enrolled ? null : (
              <Button size="sm" variant="ghost" onClick={() => onQueueStage(node.id)}>
                <Plus size={12} />
                キューに追加
              </Button>
            )}
          </div>
        ) : null}

        {/*
          発見教材 (✦)。星の下にぶら下げて「この星の脇で見つけたもの」と読ませる。
          サーバが既に絞ってあるので、ここに来た教材は必ず受けられる。
        */}
        {discoveries.length > 0 ? (
          <ul className="mt-2 flex flex-col gap-1.5">
            {discoveries.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => onOpenDiscovery?.(d.id)}
                  disabled={!onOpenDiscovery}
                  title={d.description}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-md border border-brand/40 bg-brand-soft px-2.5 py-1.5 text-left",
                    onOpenDiscovery ? "hover:border-brand" : "cursor-default",
                  )}
                >
                  <Sparkles size={12} className="mt-0.5 shrink-0 text-brand" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-medium leading-snug">{d.title}</span>
                    <span className="mt-0.5 block text-[10.5px] text-ink-3">
                      発見！ AI生成・講師確認済み · {d.question_count} 問
                      {d.passed ? " · 合格済み" : ""}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </li>
  );
};
