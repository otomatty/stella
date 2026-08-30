/**
 * スキルマップ / スキルプロフィール / 「次にやるリスト」の取得 Hook (Phase 2)。
 *
 * バックエンド未設定 (デモ) / 未ログイン時は no-op で null のまま返す — ダミーの道を
 * 描くと「進んだのに星が点かない」ように見えるため、何も出さない方を選ぶ。
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { isBackendConfigured } from "@/lib/backend";
import { subscribeDevMode } from "@/lib/dev-mode";
import {
  addToStageQueue,
  getSkillMap,
  getSkillProfile,
  getStageQueue,
  putActiveStage,
  removeFromStageQueue,
  reorderStageQueue,
  startStage as startStageRequest,
  type SkillMapMine,
  type SkillProfileMine,
  type StageQueueEntry,
} from "@/lib/skill-map-api";

export interface UseSkillMapResult {
  map: SkillMapMine | null;
  profile: SkillProfileMine | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  /** いま進める星を切り替える (`null` で解除)。成功したらマップを引き直す。 */
  setActiveStage: (stageId: string | null) => Promise<void>;
  /**
   * 星を **自分で始めて**、そのまま「いま進める星」にする (Phase 3b)。
   *
   * 開始 (受講登録) → フォーカスの順に投げる。逆にすると、フォーカスの保存が
   * 受講登録を要求する (`PUT /api/skill-map/active-stage`) ぶんだけ必ず 400 になる。
   * 既に始めている星への再実行は開始側が冪等に流すので、画面は「解放されているなら
   * 押せる」だけを見ればよい。
   */
  startStage: (stageId: string) => Promise<void>;
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : "取得に失敗しました";
}

export interface UseSkillMapOptions {
  /**
   * スキルプロフィール (XP / レベル / ストリーク) も取るか。既定は取る。
   *
   * HUD を描かない画面 (ステージ一覧は現在地とキューしか使わない) では `false` に
   * する。描かない数字のために毎回 2 本目のリクエストを投げないため。
   */
  withProfile?: boolean;
}

export function useSkillMap(
  userId: string | null,
  enabled = true,
  { withProfile = true }: UseSkillMapOptions = {},
): UseSkillMapResult {
  const [map, setMap] = useState<SkillMapMine | null>(null);
  const [profile, setProfile] = useState<SkillProfileMine | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const refetch = useCallback(async () => {
    const reqId = ++requestIdRef.current;
    if (!enabled || !userId || !isBackendConfigured()) {
      setMap(null);
      setProfile(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // 道と HUD は同時に描くので 2 本まとめて待つ (片方だけ先に出すと数字が踊る)。
      const [nextMap, nextProfile] = await Promise.all([
        getSkillMap(),
        withProfile ? getSkillProfile() : Promise.resolve(null),
      ]);
      if (reqId !== requestIdRef.current) return;
      setMap(nextMap);
      setProfile(nextProfile);
    } catch (err) {
      if (reqId !== requestIdRef.current) return;
      setError(messageOf(err));
    } finally {
      if (reqId === requestIdRef.current) setLoading(false);
    }
  }, [enabled, userId, withProfile]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  // FAB で開発者モードを切り替えるとヘッダが変わるので、道を取り直す。
  useEffect(() => subscribeDevMode(() => void refetch()), [refetch]);

  const setActiveStage = useCallback(
    async (stageId: string | null) => {
      await putActiveStage(stageId);
      await refetch();
    },
    [refetch],
  );

  const startStage = useCallback(
    async (stageId: string) => {
      await startStageRequest(stageId);
      await putActiveStage(stageId);
      await refetch();
    },
    [refetch],
  );

  return { map, profile, loading, error, refetch, setActiveStage, startStage };
}

export interface UseStageQueueResult {
  /** 並び順どおりのステージ id。 */
  queue: string[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  add: (stageId: string) => Promise<void>;
  remove: (stageId: string) => Promise<void>;
  reorder: (stageIds: string[]) => Promise<void>;
}

export function useStageQueue(userId: string | null, enabled = true): UseStageQueueResult {
  const [entries, setEntries] = useState<StageQueueEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const active = enabled && Boolean(userId) && isBackendConfigured();

  const refetch = useCallback(async () => {
    const reqId = ++requestIdRef.current;
    if (!active) {
      setEntries([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await getStageQueue();
      if (reqId !== requestIdRef.current) return;
      setEntries(rows);
    } catch (err) {
      if (reqId !== requestIdRef.current) return;
      setError(messageOf(err));
    } finally {
      if (reqId === requestIdRef.current) setLoading(false);
    }
  }, [active]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  /** 変更系はサーバが返した新しい並びをそのまま採る (自前で組み立て直さない)。 */
  const apply = useCallback(async (op: () => Promise<StageQueueEntry[]>) => {
    const reqId = ++requestIdRef.current;
    try {
      const rows = await op();
      if (reqId !== requestIdRef.current) return;
      setEntries(rows);
      setError(null);
    } catch (err) {
      if (reqId !== requestIdRef.current) return;
      setError(messageOf(err));
      throw err;
    }
  }, []);

  const add = useCallback(
    async (stageId: string) => {
      if (!active) return;
      await apply(() => addToStageQueue(stageId));
    },
    [active, apply],
  );
  const remove = useCallback(
    async (stageId: string) => {
      if (!active) return;
      await apply(() => removeFromStageQueue(stageId));
    },
    [active, apply],
  );
  const reorder = useCallback(
    async (stageIds: string[]) => {
      if (!active) return;
      // 並べ替えは体感が命なので、先に画面へ反映してからサーバへ送る。
      setEntries((prev) =>
        stageIds.flatMap((id, i) => {
          const found = prev.find((row) => row.stage_id === id);
          return found ? [{ ...found, order: i }] : [];
        }),
      );
      await apply(() => reorderStageQueue(stageIds));
    },
    [active, apply],
  );

  return {
    queue: entries.map((row) => row.stage_id),
    loading,
    error,
    refetch,
    add,
    remove,
    reorder,
  };
}
