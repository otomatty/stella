/**
 * ステージクリア (修了条件達成 → 修了証の自動発行) の画面内イベントバス。
 *
 * クリアはサーバ側で判定され、複数の API 経路から返ってくる:
 *   - 進捗同期 (`POST /api/lesson-progress`) — デバウンス送信のレスポンス
 *   - 小テスト採点 (`POST /api/quiz/:id/attempt`) — 合格レスポンス
 *
 * どちらも UI から遠い場所 (ストアの flush / QuizPlayer) で受け取るため、ここで
 * 1 本のイベントに束ね、シェルに常駐する `StageClearDialog` が購読してダイアログを
 * 出す。React の外 (localStorage ストア) からも呼べるよう素の pub/sub にしてある。
 */

/** クリアになったステージ (API の `cleared_stages` を camelCase にしたもの)。 */
export interface StageClearedEvent {
  stageId: string;
  title: string;
}

type Listener = (cleared: StageClearedEvent[]) => void;

const listeners = new Set<Listener>();

export function subscribeStageCleared(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** クリアを通知する (空配列は無視)。購読者がいなければ何も起きない。 */
export function emitStageCleared(cleared: StageClearedEvent[]): void {
  if (cleared.length === 0) return;
  for (const listener of listeners) listener(cleared);
}

/** API レスポンスの `cleared_stages` をイベント形へ変換する (欠損は落とす)。 */
export function toStageClearedEvents(
  clearedStages: Array<{ stage_id?: string; stage_title?: string }> | undefined,
): StageClearedEvent[] {
  if (!Array.isArray(clearedStages)) return [];
  const events: StageClearedEvent[] = [];
  for (const row of clearedStages) {
    if (typeof row.stage_id === "string" && typeof row.stage_title === "string") {
      events.push({ stageId: row.stage_id, title: row.stage_title });
    }
  }
  return events;
}
