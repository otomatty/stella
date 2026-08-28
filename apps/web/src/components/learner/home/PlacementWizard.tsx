/**
 * プレースメント — 初回オンボーディング (Phase 3b)。
 *
 * 管理者がステージを割り当てる運用を廃止したので、**何も始めていない受講者のホームは
 * 空っぽで始まる**。ここが最初の一歩を渡す場所で、3 つだけを伝える:
 *
 *   1. あいさつと仕組み (星をともす / スキルマップは少し先まで見える)
 *   2. **どこから始めるか** … サーバの推奨順 (`next_stage_ids`) の上位を can-do 付きで
 *   3. もう知っている内容があるなら、スキルツリーの腕試しで飛び級できること
 *
 * ## 表示するかはサーバ状態だけで決める
 *
 * 出す条件は「受講登録が 1 件も無い」— つまり `GET /api/skill-map/mine` の `enrolled`
 * が全部 false かどうかで、呼び出し側 (`LearnerDashboard`) が判定する。既存ユーザーは
 * 登録を持っているので自動的に出ない。
 *
 * localStorage に持たせるのは **「あとで選ぶ」を押した記憶だけ**。「表示したかどうか」を
 * ブラウザに持たせると、端末を変えた初回利用者にウィザードが出ず、空のホームだけが
 * 残る。逆に「スキップした」は端末ローカルの都合でよく、消えても最悪もう一度出るだけ。
 * private window などで storage が使えない環境でも壊れないよう try/catch で包む。
 * **キーは利用者ごと** — 1 台の端末を複数人が使う (共用 PC / staff の「受講者画面を表示」)
 * と、前の人のスキップで次の人の初回案内が出なくなるため。
 */

import { useState } from "react";

import { AlertTriangle, Compass, Play, Sparkles } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { SkillMapStageNode } from "@/lib/skill-map-api";

/** 「あとで選ぶ」を押した記憶 (この端末 × この利用者だけ)。 */
const SKIP_KEY_PREFIX = "falcon_placement_skipped_v1";

/** 記憶のキー。 利用者が分からないときは共有キーに落ちる (ログイン前は出さない画面)。 */
function skipKey(userId: string | null): string {
  return userId ? `${SKIP_KEY_PREFIX}:${userId}` : SKIP_KEY_PREFIX;
}

/** 一度に見せる候補の数。多いと「選べない」ので、推奨順の上位だけに絞る。 */
const MAX_CHOICES = 4;

export function readPlacementSkipped(userId: string | null): boolean {
  try {
    return localStorage.getItem(skipKey(userId)) === "1";
  } catch {
    // storage が使えない環境 (private window / 設定でブロック) では「スキップしていない」。
    return false;
  }
}

function rememberSkip(userId: string | null): void {
  try {
    localStorage.setItem(skipKey(userId), "1");
  } catch {
    // 覚えられなくても実害は「次回また出る」だけなので握り潰す。
  }
}

interface PlacementWizardProps {
  /** スキルマップの星 (推奨候補の名前と can-do を引くのに使う)。 */
  nodes: SkillMapStageNode[];
  /** サーバの推奨順 (`next_stage_ids`)。 */
  nextStageIds: string[];
  /**
   * 選んだ星から始める (自己開始 API)。
   *
   * **失敗は投げ返してもらう** — ここで押した結果を出せるのはこのカードだけなので、
   * 呼び出し側が握り潰すと「押しても何も起きない (しかもボタンは無効のまま)」になる。
   */
  onStart: (stageId: string) => Promise<void>;
  /** スキルツリー (腕試し = 飛び級の入口) へ。 */
  onOpenTree: () => void;
  /** 「あとで選ぶ」。閉じたことを呼び出し側にも伝える。 */
  onSkip: () => void;
  /** スキップの記憶を分けるための利用者 id (未ログインなら null)。 */
  userId: string | null;
  className?: string;
}

export const PlacementWizard = ({
  nodes,
  nextStageIds,
  onStart,
  onOpenTree,
  onSkip,
  userId,
  className,
}: PlacementWizardProps) => {
  /** 二重に押して 2 つの星を始めてしまわないよう、押した星を覚えて止める。 */
  const [starting, setStarting] = useState<string | null>(null);
  /** 開始に失敗したときの理由。押せないまま黙るのを避けるため、この場に出す。 */
  const [error, setError] = useState<string | null>(null);

  const byId = new Map(nodes.map((node) => [node.id, node]));
  // 推奨順のうち、名前が見えている星だけ (霧の星は候補にしない)。
  const choices = nextStageIds
    .flatMap((id) => {
      const node = byId.get(id);
      return node && node.visibility !== "fog" && node.title ? [node] : [];
    })
    .slice(0, MAX_CHOICES);

  const skip = () => {
    rememberSkip(userId);
    onSkip();
  };

  /**
   * 「ここから始める」。**成否にかかわらず押下状態を解く**。
   *
   * 失敗したまま `starting` を残すと、全部のボタンが無効な板になって先へ進めない
   * (このカードは受講登録が 0 件のときにだけ出るので、閉じても空のホームしか無い)。
   */
  const start = (stageId: string) => {
    setStarting(stageId);
    setError(null);
    void onStart(stageId)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "ステージを開始できませんでした"),
      )
      .finally(() => setStarting(null));
  };

  return (
    <Card className={className}>
      <div className="px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex items-start gap-3">
          <div className="sf-gradient-bg grid size-9 shrink-0 place-items-center rounded-full text-brand-foreground">
            <Sparkles size={16} />
          </div>
          <div className="min-w-0">
            <h2 className="text-[16px] font-semibold tracking-tight">スキルマップへようこそ</h2>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
              ひとつ終えると、スキルマップが少しずつ見えてきます。
              まずはどこから始めるか選びましょう。
            </p>
          </div>
        </div>

        {choices.length === 0 ? (
          <p className="mt-4 rounded-md border border-border bg-sunken px-3 py-2.5 text-[12.5px] text-ink-3">
            いま始められる教材がありません。公開されるまで少しお待ちください。
          </p>
        ) : (
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {choices.map((node) => (
              <li key={node.id}>
                <Card className="flex h-full flex-col gap-2 border-border p-3.5">
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-semibold leading-snug">{node.title}</div>
                    {node.category ? (
                      <div className="mt-0.5 text-[11.5px] text-ink-3">{node.category}</div>
                    ) : null}
                  </div>
                  {node.can_do ? (
                    <p className="text-[12px] leading-relaxed text-ink-2">
                      このスキルを身につけると{" "}
                      <strong className="text-foreground">{node.can_do}</strong>。
                    </p>
                  ) : null}
                  <Button
                    size="sm"
                    variant="accent"
                    className="mt-auto"
                    disabled={starting !== null}
                    onClick={() => start(node.id)}
                  >
                    <Play size={12} />
                    {starting === node.id ? "開始中…" : "ここから始める"}
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        )}

        {error ? (
          <p className="mt-3 flex items-center gap-1.5 text-[12px] text-destructive">
            <AlertTriangle size={13} className="shrink-0" />
            開始できませんでした: {error}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-3.5">
          <span className="text-[12px] text-ink-3">すでに知っている内容がある場合</span>
          <Button size="sm" variant="outline" onClick={onOpenTree}>
            <Compass size={12} />
            スキルツリーを見る
          </Button>
          <span className="text-[11.5px] text-ink-3">
            腕試しに合格すると、先のスキルから始められます。
          </span>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={skip}>
            あとで選ぶ
          </Button>
        </div>
      </div>
    </Card>
  );
};
