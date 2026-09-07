/**
 * 受講者 UI 用のステージ一覧ソース。
 *
 * - バックエンド設定済み: DB から読む。失敗時は空配列 + error（fixtures に戻さない）。
 * - バックエンド未設定: 既存 fixtures（デモ専用）。
 *
 * 受講者 UI (`StageList` / `StageDetail` / `LessonPlayer`) は `Stage[]` 型を
 * そのまま受け取り続けるため、 マッパー (`mapStageToUi`) で正規化する。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { mapStageToUi, type StageWithChildren, type UiStage } from "@stella/shared/cms/types";
import { createLatestRequest } from "@/data/latest-request";
import type { Stage, Tenant } from "@/data/types";
import { isBackendConfigured } from "@/lib/backend";
import { getStageWithChildren, listStages } from "@/lib/cms-api";
import { listEnrollmentsForUser } from "@/lib/enrollments-api";
import { isReadableEnrollmentStatus } from "@stella/shared/enrollment/access";

/** デモ経路にカタログ stub は置かない。教材は D1 seed（packages/content）だけ。 */
function fixturesFor(_tenantId: Tenant["id"]): Stage[] {
  return [];
}

type DataSource = "db" | "fixtures" | "error";

interface UseStagesResult {
  stages: Stage[];
  loading: boolean;
  error: string | null;
  source: DataSource;
  /**
   * 一覧を取り直し、 **この呼び出しが読んだ一覧** を返す。
   *
   * Phase 3b で受講登録が **画面の操作から増える** ようになった (自己開始) ため、
   * 「開始したのに一覧に出ない」 状態を残さないよう明示的な取り直し口を持つ。
   *
   * 戻り値があるのは、 開始した直後に「そのステージの最初のレッスン」へ飛ぶ側
   * (スキルツリーの「ここから始める」) が **待ってから** 遷移できるようにするため。
   * state (`stages`) の更新を待たずに遷移すると、 一覧にまだ載っていない一瞬だけ
   * 「ステージが見つかりません」が出る。 取得できなかった場合 (無効化・失敗) は空配列
   * — 画面に出す error は state 側が持つ。
   */
  refetch: () => Promise<Stage[]>;
}

export function useStagesForTenant(tenantId: Tenant["id"], enabled = true): UseStagesResult {
  const backend = isBackendConfigured();
  const [stages, setStages] = useState<Stage[]>(() => (backend ? [] : fixturesFor(tenantId)));
  const [loading, setLoading] = useState(backend && enabled);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<DataSource>(backend ? "db" : "fixtures");
  /**
   * 読み出しを 1 つの callback に閉じる。 `useEffect` は初回、 `refetch()` は明示的な
   * 取り直しに使い、 どちらも同じ経路を通る (useSkillMap と同じ流儀)。
   * 途中で条件が変わったときの取りこぼしは版番号 (`latest-request.ts`) で捨てる。
   */
  const requestRef = useRef(createLatestRequest<Stage[]>());
  const fetchStages = useCallback(
    async (reqId: number): Promise<Stage[]> => {
      const request = requestRef.current;
      const cancelled = () => !request.isCurrent(reqId);
      /** 追い越されたときの戻り値。 state は新しい読み出しが埋める。 */
      const superseded = () => request.joinLatest(reqId, []);
      // role 等で未使用の場合はフェッチしない (二重フェッチ抑止)。
      if (!enabled) {
        setLoading(false);
        return [];
      }
      if (!isBackendConfigured()) {
        const demo = fixturesFor(tenantId);
        setStages(demo);
        setSource("fixtures");
        setError(null);
        setLoading(false);
        return demo;
      }

      setLoading(true);
      try {
        const stageRows = await listStages(tenantId);
        if (cancelled()) return superseded();
        // クエリ成功 = DB を真実として採用する。 空 (= 未 seed / RLS で全部 draft 等) でも
        // fixtures に fallback しない (#10 — Codex P2: RLS で隠した draft が漏れるのを防ぐ)。
        if (stageRows.length === 0) {
          setStages([]);
          setSource("db");
          setError(null);
          return [];
        }
        const details = await Promise.all(stageRows.map((row) => getStageWithChildren(row.id)));
        if (cancelled()) return superseded();
        const withChildren: StageWithChildren[] = details.filter(
          (d): d is StageWithChildren => d !== null,
        );
        const ui: UiStage[] = withChildren.map(mapStageToUi);
        // UiStage は Stage と shape 互換 (cms/types.ts のコメント参照)。
        const next = ui as unknown as Stage[];
        setStages(next);
        setSource("db");
        setError(null);
        return next;
      } catch (err) {
        console.error("[useStagesForTenant] DB fetch failed", err);
        if (cancelled()) return superseded();
        setStages([]);
        setSource("error");
        setError(err instanceof Error ? err.message : "fetch failed");
        return [];
      } finally {
        if (!cancelled()) setLoading(false);
      }
    },
    [tenantId, enabled],
  );

  /** 版番号を採ってから読み出し、 進行中として登録する (追い越された側の相乗り先)。 */
  const load = useCallback((): Promise<Stage[]> => {
    const reqId = requestRef.current.begin();
    const promise = fetchStages(reqId);
    requestRef.current.track(reqId, promise);
    return promise;
  }, [fetchStages]);

  useEffect(() => {
    void load();
  }, [load]);

  return { stages, loading, error, source, refetch: load };
}

/**
 * 受講者ダッシュボード / ステージ一覧用の「自分に割り当てられたステージ」ソース (Issue #20)。
 *
 * `useStagesForTenant` (テナントの published ステージ一覧 = 公開ステージを「探す」) とは分離し、
 * enrollment ベースで自分が受講登録されたステージのみを返す。 各ステージには enrollment 由来の
 * 期限 (`dueAt`) / 必須 (`required`) / 完了 (`completed`) を実データで載せる。
 *
 * - バックエンド未設定: 従来どおり fixtures をそのまま返す (デモ用)。
 * - バックエンド設定済み: enrollment → ステージ詳細を引いてマージする。 enrollment が無ければ空。
 *   失敗時は空配列 + error（fixtures に戻さない）。
 *   draft ステージの enrollment は stages RLS で詳細取得が null になり、 受講者には現れない。
 */
export function useEnrolledStagesForTenant(
  tenantId: Tenant["id"],
  userId: string | null,
  enabled = true,
): UseStagesResult {
  const backend = isBackendConfigured();
  const [stages, setStages] = useState<Stage[]>(() => (backend ? [] : fixturesFor(tenantId)));
  const [loading, setLoading] = useState(backend && enabled);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<DataSource>(backend ? "db" : "fixtures");
  /** 読み出しは 1 つの callback に閉じる (上の `useStagesForTenant` と同じ理由)。 */
  const requestRef = useRef(createLatestRequest<Stage[]>());
  const fetchStages = useCallback(
    async (reqId: number): Promise<Stage[]> => {
      const request = requestRef.current;
      const cancelled = () => !request.isCurrent(reqId);
      /** 追い越されたときの戻り値。 state は新しい読み出しが埋める。 */
      const superseded = () => request.joinLatest(reqId, []);
      // role 等で未使用の場合はフェッチしない (二重フェッチ抑止)。
      if (!enabled) {
        setLoading(false);
        return [];
      }
      if (!isBackendConfigured()) {
        const demo = fixturesFor(tenantId);
        setStages(demo);
        setSource("fixtures");
        setError(null);
        setLoading(false);
        return demo;
      }
      if (!userId) {
        setStages([]);
        setSource("db");
        setError(null);
        setLoading(false);
        return [];
      }

      setLoading(true);
      try {
        const allEnrollments = await listEnrollmentsForUser(userId);
        if (cancelled()) return superseded();
        // 期限切れ (expired) の登録は一覧に出さない。 API 側は教材・資料・検索を
        // 一律で拒否するため、 ここに残すと「一覧には出るが開くと 404」になる。
        const enrollments = allEnrollments.filter((e) => isReadableEnrollmentStatus(e.status));
        if (enrollments.length === 0) {
          setStages([]);
          setSource("db");
          setError(null);
          return [];
        }
        // 1 ステージの取得失敗 (削除済み / 一時的なエラー等) で全体を error に
        // しないよう、 個別に catch して null に倒す。
        const details = await Promise.all(
          enrollments.map((e) =>
            getStageWithChildren(e.stage_id).catch((err) => {
              console.error(`[useEnrolledStagesForTenant] stage ${e.stage_id} fetch failed`, err);
              return null;
            }),
          ),
        );
        if (cancelled()) return superseded();
        const detailById = new Map(
          details.filter((d): d is StageWithChildren => d !== null).map((d) => [d.stage.id, d]),
        );

        const merged: Stage[] = [];
        for (const e of enrollments) {
          const detail = detailById.get(e.stage_id);
          // 詳細が引けない (= draft / RLS で不可視) ステージは受講者一覧に出さない。
          if (!detail) continue;
          // staff は CMS API から draft / archived の詳細も引けてしまうため、 ここでも弾く。
          // 受講者は API 側で既に null になるので、 この判定は staff にだけ効く。
          if (detail.stage.status !== "published") continue;
          const ui: UiStage = mapStageToUi(detail);
          const completed = e.status === "completed";
          // UiStage は Stage と shape 互換 (cms/types.ts のコメント参照)。
          merged.push({
            ...ui,
            dueAt: e.due_at,
            required: e.required,
            completed,
          } as unknown as Stage);
        }
        setStages(merged);
        setSource("db");
        setError(null);
        return merged;
      } catch (err) {
        console.error("[useEnrolledStagesForTenant] DB fetch failed", err);
        if (cancelled()) return superseded();
        setStages([]);
        setSource("error");
        setError(err instanceof Error ? err.message : "fetch failed");
        return [];
      } finally {
        if (!cancelled()) setLoading(false);
      }
    },
    [tenantId, userId, enabled],
  );

  /** 版番号を採ってから読み出し、 進行中として登録する (追い越された側の相乗り先)。 */
  const load = useCallback((): Promise<Stage[]> => {
    const reqId = requestRef.current.begin();
    const promise = fetchStages(reqId);
    requestRef.current.track(reqId, promise);
    return promise;
  }, [fetchStages]);

  useEffect(() => {
    void load();
  }, [load]);

  return { stages, loading, error, source, refetch: load };
}
