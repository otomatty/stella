/**
 * 週次の育成メモの画面で、表示中の週と操作する対象を一致させる (#38)。
 *
 * 週を切り替えた直後は、前の週の取得結果がまだ手元に残っている。そのまま出すと、見出しは
 * 新しい週なのに前の週のメモから一言を送れてしまう。求めた週の結果が届くまではメモを出さない。
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
