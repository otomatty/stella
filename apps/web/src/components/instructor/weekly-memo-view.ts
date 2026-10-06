/**
 * 週次の育成メモの画面 (#38) の表示の決め方。講師ダッシュボードと管理者のダッシュボードで使う。
 *
 * - 表示中の週と操作する対象を一致させる。週を切り替えた直後は、前の週の取得結果がまだ手元に
 *   残っている。そのまま出すと、見出しは新しい週なのに前の週のメモから一言を送れてしまう。
 * - 出るメモの範囲を、API が返す範囲 (講師は今担当している受講者、管理者はテナントの全員) どおりに書く。
 */

export interface MemoWeekData<M> {
  week: string;
  memos: M[];
}

/**
 * 求めた週 (`requested`。null は既定の週 = サーバーが決めた週) の結果だけを返す。
 * まだ届いていない・別の週の結果なら null (読み込み中として扱い、操作させない)。
 */
export function memosForWeek<M>(
  data: MemoWeekData<M> | null,
  requested: string | null,
): M[] | null {
  if (!data) return null;
  if (requested !== null && data.week !== requested) return null;
  return data.memos;
}

/** assigned = 講師 (今担当している受講者のメモ)、tenant = 管理者 (テナントの、担当講師のいる受講者全員)。 */
export type MemoAudience = "assigned" | "tenant";

/** 画面の説明と、メモが無いときの文。 */
export function weeklyMemoIntro(audience: MemoAudience): { scope: string; empty: string } {
  return audience === "tenant"
    ? {
        scope: "テナントの、担当講師のいる受講者の1週間の様子です。",
        empty: "この週のメモはありません。メモは担当講師のいる受講者ごとに、週明けに順に作ります。",
      }
    : {
        scope: "担当している受講者の1週間の様子です。",
        empty: "この週のメモはありません。担当している受講者のメモは、週明けに順に作ります。",
      };
}
