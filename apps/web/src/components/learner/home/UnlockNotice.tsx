/**
 * 解放通知 — 前回の訪問から新しく開いた星と、新しく灯った発見教材を知らせるカード
 * (Phase 2 / Phase 4)。
 *
 * ## 比較の記憶は localStorage
 *
 * 「前回見たときに開いていた星」はサーバに置くほどのものではない (端末ごとに
 * 1 回見せれば役目が終わる) ので localStorage に持つ。読み書きは必ず try/catch —
 * プライベートウィンドウや容量超過で例外になるが、その程度のことでホームを
 * 落としてはいけない。読めなければ「通知を出さない」側に倒す。
 *
 * **初回訪問では出さない。** 記録が無い状態を「全部が新しい」と読むと、初めて
 * ホームを開いた受講者にいきなり全ステージの解放通知が出る。記録が無いときは
 * 黙って現状を書き込むだけにする。
 *
 * ## 発見教材は別のキーで覚える
 *
 * 星の記録と同じ配列に混ぜると、Phase 4 より前に書かれた記録 (星の id しか無い)
 * を読んだ端末で、既に見ていた発見教材まで「新しい」と判定されてしまう。キーを
 * 分けておけば、発見教材側も **その端末での初回は黙って記録するだけ** という同じ
 * 規則で立ち上がる。
 */

import { useEffect, useMemo, useState } from "react";

import { Sparkles, X } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** 端末 × 利用者ごとの「前回見たときに開いていた星」。 */
const STORAGE_KEY_PREFIX = "falcon_seen_unlocked_stages_v1";
/** 端末 × 利用者ごとの「前回見たときに灯っていた発見教材」。 */
const DISCOVERY_STORAGE_KEY_PREFIX = "falcon_seen_discoveries_v1";

/**
 * 記憶のキー。**利用者ごとに分ける** (`PlacementWizard` の「あとで選ぶ」と同じ流儀)。
 *
 * 共有端末で別の受講者がログインすると、前の人が見た星と教材が「見たこと」になり、
 * 本当は初めて見る解放通知が黙って消える。利用者が分からないときだけ共有キーに
 * 落ちる (ログイン前には出さない画面なので、実際にはほぼ通らない)。
 *
 * キーを分ける前に書かれた記録は読まない。読めない = 初回訪問の扱いになり、黙って
 * 現状を書き込むだけで通知は出ない — 誤って全ステージの解放通知が出るより安全な側。
 */
function seenKey(prefix: string, userId: string | null): string {
  return userId ? `${prefix}:${userId}` : prefix;
}

function readSeen(key: string): string[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : null;
  } catch {
    return null;
  }
}

function writeSeen(key: string, ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    // 保存できないだけ。通知を出せないのは次回また比較すれば済む。
  }
}

/**
 * 「前回から増えたもの」を返し、今回ぶんを記録する。
 *
 * 記録が無い (初回) ときは `[]` を返して黙って覚えるだけ — 星でも発見教材でも
 * 規則は同じなのでここに寄せる。
 */
function diffAndRemember(key: string, ids: string[], exclude: Set<string>): string[] {
  const seen = readSeen(key);
  writeSeen(key, ids);
  if (seen === null) return [];
  const seenSet = new Set(seen);
  return ids.filter((id) => !seenSet.has(id) && !exclude.has(id));
}

interface UnlockNoticeProps {
  /** いま開いている (= unlocked / active / cleared) 星の id。 */
  openStageIds: string[];
  /** 表示名の引き当て。霧の星は名前を持たないので出さない。 */
  titleOf: (stageId: string) => string | undefined;
  /** マップの取得が終わるまでは比較しない (空配列を「全部閉じた」と誤読しないため)。 */
  ready: boolean;
  /**
   * いま進めている星。**新規解放としては出さない。**
   *
   * 評価器はアクティブな星を前提未充足でも `active` にする (locked に落とさない) ので、
   * 自分でフォーカスを切り替えるとその星が「開いた星」に入り、自分の操作が
   * 「新しい道が拓けました」として返ってくる。記録 (localStorage) には残すので、
   * あとで本当に前提を満たして開いたときに二重で出ることはない。
   */
  activeStageId?: string | null;
  /** いま見えている発見教材 (Phase 4)。増えていれば「新しい教材」として知らせる。 */
  discoveries?: { id: string; title: string }[];
  /** 記憶を分ける相手 (共有端末で前の利用者の記録を引き継がないため)。 */
  userId?: string | null;
  className?: string;
}

export const UnlockNotice = ({
  openStageIds,
  titleOf,
  ready,
  activeStageId = null,
  discoveries = [],
  userId = null,
  className,
}: UnlockNoticeProps) => {
  const [newIds, setNewIds] = useState<string[]>([]);
  const [newDiscoveries, setNewDiscoveries] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const key = useMemo(() => [...openStageIds].sort().join(","), [openStageIds]);
  const discoveryKey = useMemo(
    () =>
      [...discoveries]
        .map((d) => d.id)
        .sort()
        .join(","),
    [discoveries],
  );
  /** id → 教材名 (通知の文面にだけ使うので、描画のたびに引き直せば足りる)。 */
  const discoveryTitleOf = (id: string) => discoveries.find((d) => d.id === id)?.title;

  useEffect(() => {
    if (!ready) return;
    const ids = key === "" ? [] : key.split(",");
    // 記録には全部を残しつつ、通知からは自分で選んだ現在地だけ除く。
    const fresh = diffAndRemember(
      seenKey(STORAGE_KEY_PREFIX, userId),
      ids,
      new Set(activeStageId ? [activeStageId] : []),
    );

    const discoveryIds = discoveryKey === "" ? [] : discoveryKey.split(",");
    const freshDiscoveries = diffAndRemember(
      seenKey(DISCOVERY_STORAGE_KEY_PREFIX, userId),
      discoveryIds,
      new Set(),
    );

    if (fresh.length > 0 || freshDiscoveries.length > 0) {
      setNewIds(fresh);
      setNewDiscoveries(freshDiscoveries);
      setDismissed(false);
    }
  }, [key, discoveryKey, ready, activeStageId, userId]);

  if (dismissed || (newIds.length === 0 && newDiscoveries.length === 0)) return null;
  const titles = newIds.map(titleOf).filter((t): t is string => Boolean(t));
  const discoveryNames = newDiscoveries
    .map(discoveryTitleOf)
    .filter((t): t is string => Boolean(t));

  // 星と教材のどちらが増えたかで見出しを変える (両方なら星を主にする — 道が伸びる方が
  // 大きな出来事なので)。
  const heading = newIds.length > 0 ? "新しい道が拓けました" : "新しい教材が解放されました";

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border border-brand/40 bg-brand-soft px-4 py-3",
        className,
      )}
    >
      <span className="mt-0.5 grid place-items-center w-7 h-7 rounded-full bg-card text-brand shrink-0">
        <Sparkles size={14} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold">{heading}</div>
        {newIds.length > 0 ? (
          <div className="text-[11.5px] text-ink-2 mt-0.5">
            {titles.length > 0
              ? `${titles.join(" · ")} に進めるようになりました。`
              : `${newIds.length} つのステージに進めるようになりました。`}
          </div>
        ) : null}
        {newDiscoveries.length > 0 ? (
          <div className="text-[11.5px] text-ink-2 mt-0.5">
            {discoveryNames.length > 0
              ? `✦ ${discoveryNames.join(" · ")} が道の脇に灯りました。`
              : `✦ ${newDiscoveries.length} つの教材が道の脇に灯りました。`}
          </div>
        ) : null}
      </div>
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label="閉じる"
        onClick={() => setDismissed(true)}
        className="shrink-0"
      >
        <X size={14} />
      </Button>
    </div>
  );
};
