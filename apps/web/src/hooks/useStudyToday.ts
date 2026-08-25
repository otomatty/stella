import { useEffect, useState } from "react";

import { msUntilNextStudyDay, toStudyDate } from "@falcon/shared/study/activity";

/**
 * アプリ基準 TZ (JST) の「今日」(`YYYY-MM-DD`)。 日付が変わったら採り直す。
 *
 * マウント時に 1 度だけ決めると、 開きっぱなしの画面 —— 講師が既定タブとして開いたままに
 * するモニタリングなど —— が翌日も前日の「今日」を持ち続け、 面談までのカウントダウンや
 * 「今月」の集計、 要フォロー判定が丸一日ずれる。 それを防ぐため
 *   - 次の日付境界に setTimeout を張る
 *   - スリープ復帰などでタイマーが飛ぶことがあるので、 タブが再表示されたときにも見直す
 * の 2 経路で更新する。
 */
export function useStudyToday(): string {
  const [today, setToday] = useState(() => toStudyDate(Date.now()));

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    // 日付が変わっていなければ state を触らない (同じ文字列での再描画を避ける)。
    const sync = () =>
      setToday((current) => {
        const next = toStudyDate(Date.now());
        return next === current ? current : next;
      });

    const scheduleNextBoundary = () => {
      // +1000ms: 境界ちょうどに起きて前日を読んでしまわないよう、 少しだけ跨がせる。
      timer = setTimeout(() => {
        sync();
        scheduleNextBoundary();
      }, msUntilNextStudyDay(Date.now()) + 1_000);
    };

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      sync();
      if (timer !== undefined) clearTimeout(timer);
      scheduleNextBoundary();
    };

    scheduleNextBoundary();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      if (timer !== undefined) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return today;
}
