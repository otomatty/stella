/**
 * ステージクリアの祝福ダイアログ。
 *
 * サーバが修了条件の達成を検知して修了証を自動発行すると、進捗同期 / 小テスト採点の
 * レスポンスに `cleared_stages` が載る (`@/lib/stage-clear-events`)。シェルに常駐する
 * この 1 枚がそれを購読し、「クリアした」ことを伝えたうえでスキルツリーへ誘導する —
 * 解放された次の星を自分の目で確かめてもらうのが目的なので、遷移をダイアログの
 * 主動線にする。
 *
 * 進捗同期はデバウンス送信なので、最後のレッスンを完了した 2 秒ほど後に届くことがある
 * (レッスンビューアを開いたままでも出る)。複数ステージが同時にクリアになった場合
 * (まとめ同期) は 1 枚のダイアログに列挙する。
 */

import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Sparkles } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { subscribeStageCleared, type StageClearedEvent } from "@/lib/stage-clear-events";

export function StageClearDialog({ onCleared }: { onCleared?: () => void }) {
  const navigate = useNavigate();
  const [cleared, setCleared] = useState<StageClearedEvent[]>([]);

  useEffect(
    () =>
      subscribeStageCleared((stages) => {
        // 開いている間に別のクリアが届いたら足す (閉じる前に上書きして見落とさせない)。
        setCleared((prev) => {
          const known = new Set(prev.map((s) => s.stageId));
          return [...prev, ...stages.filter((s) => !known.has(s.stageId))];
        });
        // クリアはサーバ側の状態変化 (enrollment completed / 修了証発行) なので、
        // シェルが持っている受講ステージ一覧などをここで取り直させる。取り直さないと、
        // 一覧やダッシュボードの完了数がリロードまで古いままになる。
        onCleared?.();
      }),
    [onCleared],
  );

  const close = () => setCleared([]);
  const goSkillTree = () => {
    close();
    void navigate({ to: "/skill-tree" });
  };

  return (
    <Dialog open={cleared.length > 0} onOpenChange={(open) => !open && close()}>
      <DialogContent className="w-[min(calc(100vw-2rem),440px)]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="grid place-items-center w-8 h-8 rounded-full bg-brand/15 text-brand">
              <Sparkles size={16} />
            </span>
            <DialogTitle>ステージクリア！</DialogTitle>
          </div>
          <DialogDescription>
            {cleared.map((stage) => (
              <span key={stage.stageId} className="block">
                「{stage.title}」をクリアしました。
              </span>
            ))}
            <span className="block mt-1.5">
              修了証が発行されました。スキルツリーで次のステージが解放されています。
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={close}>閉じる</Button>
          <Button variant="accent" onClick={goSkillTree}>
            <Sparkles size={14} />
            スキルツリーを見る
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
