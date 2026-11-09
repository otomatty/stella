/**
 * スキルツリー — 星座として見る学習の全体像 (Phase 3a → 同心円 + キャンバス化)。
 *
 * ホームの「スキルマップ」が 1 本の縦線で「今どこか」を見せるのに対し、こちらは
 * **俯瞰**。星 = ステージ (教材) で、クリアした星が灯り、前提が線で繋がる。
 * 配置は星座 (`radial-layout.ts`): 中心が入口の星、前提を進むほど外へ、枝ごとに
 * 詰めて折れ曲がる鎖になる。盤面は `SkillTreeCanvas` の上にあり、Miro のようにドラッグで動かし、
 * ホイール / ピンチで拡縮できる。
 *
 * ## クライアントで秘匿を再実装しない
 *
 * 何をどこまで見せるかは `GET /api/skill-map/mine` が決めていて、霧 (2 歩先) の通常応答は
 * タイトルと前提線まで (slug・解放条件は載せない)、3 歩先は線を引くトポロジだけ、
 * 4 歩以上先は応答に現れない。ここは受け取った `state` × `visibility` を見た目に写す
 * だけ。開発者モード (`revealDev`) のときだけ段を素通しで描く — 開始や腕試しは
 * `full` 以外をサーバが断る。
 *
 * ## 3 歩先は星を描かず、線をフェードさせる
 *
 * `visibility === "edge"` の星は**幽霊ノード**。レイアウトは座標まで計算するが、
 * ここでは星を描かず、手前の星から伸びる線だけを**外へ向かって透明になるグラデーション**で
 * 引く。「道は続いている / でもその先は今の自分には関係ない / どこまで続くかは分からない」
 * の 3 つを線 1 本で言うための表現。
 *
 * ## 線は SVG・星は button
 *
 * 星は `<button>` にして、キーボードでも到達できるようにする (SVG の図形に
 * `tabindex` を付けるより素直で、Popover のアンカーにもそのまま使える)。前提の線
 * だけを背後の SVG に敷き、座標は `radial-layout.ts` の決定的な計算に任せる。
 * 島の名前は星団の上のタイトルとジャンプチップ・端の矢印で示す。島の範囲はルート色の光の雲。
 *
 * ## 詳細の器は幅で入れ替える
 *
 * 星の詳細は、sm 以上ではマウスを載せると開くポップオーバー (押すと寄せて固定し、
 * カードの外か Esc で閉じる。タブレットのタップとキーボードの Enter は押した扱い)、
 * スマホ幅 (`useIsMobileViewport`) ではタップで開くドロワー。スマホでポップオーバーを
 * 出すと、星が盤面の transform の中にあるぶん指の下に潜り込み、幅も画面に対して大きすぎて
 * 位置が定まらない。ドロワーなら盤面と重ならない場所に必ず出て、指の届く下端にボタンが並ぶ。
 * **何を出すかは器ではなく `star-detail.ts` が決める** (器ごとに条件を書くとずれる)。
 *
 * カードは同時に 1 つで、開いている星は `SkillTree` が持つ。ドロワーも星ごとに持たせず
 * 盤面に 1 つだけ置く (24 星ぶんの Dialog を積まない)。
 *
 * ## ホームの盤面 (ガイドとつながる)
 *
 * この盤面は受講者のホームそのもの (`LearnerHome`)。横のガイドが「次にやること」を
 * 言い、盤面は「それがどこか」を見せる。開いた直後は **現在地の星へ寄せ**
 * (`initialFocusStageId`)。現在地が無ければ入口の星座。ガイドの「ツリーで見る」は
 * `handleRef.focusStage` で星へ寄る。進行中の星の詳細カードには進捗と次のレッスンを
 * 足す (`activeInfo`)。
 * ガイドは盤面の上に浮かぶカードなので、その陰 (`insetLeft`) は見えている範囲から外す —
 * 寄せる中心・画面端の矢印・ルート名の置き場所は、カードの右側だけで決める。島チップは
 * カードと重ならない右上 (ズームボタンの左) に置く。
 *
 * ## 解放の演出は差分で 1 回だけ
 *
 * 「前回見たときは閉じていた星が開いた」「無かった星が現れた (教材の公開)」を
 * `celebration.ts` が localStorage の前回スナップショットとの差分で検出し、その星に
 * 1 回だけアニメーションを付ける (`index.css` の `tree-*`)。reduced-motion では
 * すべて止まる。
 */

import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent, ReactNode, RefObject } from "react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { useIsMobileViewport } from "@/hooks/useIsMobileViewport";
import { isApiConfigured } from "@/lib/api-client";
import { ArrowUp, Book, Check, Lock, Play, Plus, Sparkles, Star, X } from "@/lib/icons";
import { getSkillMapIcons, type SkillMapStageNode } from "@/lib/skill-map-api";
import { cn } from "@/lib/utils";

import { useSkillTreeCelebration, type CelebrationKind } from "./celebration";
import { showsStar } from "./fog-display";
import { iconFetchKey } from "./icon-fetch-key";
import { offscreenMarkers, type ViewState } from "./offscreen";
import { placeOverviewCards, summarizeRegions } from "./overview";
import {
  layoutRadialSkillTree,
  type RadialBounds,
  type RadialIsland,
  type RadialNode,
} from "./radial-layout";
import { ROUTE_ACCENTS, routeAccentOf, routeSolidOf } from "./route-accents";
import { sectorLabelsInView } from "./sector-label";
import { SkillTreeCanvas, type SkillTreeCanvasHandle } from "./SkillTreeCanvas";
import { describeStar, hasStarActions, labelOf, type StarDetail } from "./star-detail";
import { nextUnlockIds } from "./next-unlock";
import { estimateStarLabelWidth, placeStarLabels, type StarLabelSide } from "./star-labels";

/**
 * 進行中の星の詳細カードに足す情報。盤面は受講中のレッスンを知らないので、ホームが渡す。
 */
export interface ActiveStarInfo {
  /** 進捗 (0-100)。 */
  progress: number;
  /** 次のレッスン / 残っている課題の文面。 */
  detail: string;
  /** 受講者の番の課題が残っているとき、「続きから」の代わりに「課題に取り組む」を出す。 */
  openTask?: () => void;
}

/** 親 (ホームのガイド) から盤面を操作するためのハンドル。 */
export interface SkillTreeHandle {
  /** その星へ寄せて名前を出す。盤面に描いていない星なら false。 */
  focusStage: (stageId: string) => boolean;
  /** 本土・カテゴリ・島へ寄せる。対象が無ければ false。 */
  focusRegion: (key: string) => boolean;
}

interface SkillTreeProps {
  nodes: SkillMapStageNode[];
  /** 演出のスナップショットを本人ごとに分けるためのキー。 */
  currentUserId: string | null;
  activeStageId: string | null;
  /** 既に「次にやるリスト」に積んである星。 */
  queuedStageIds: string[];
  /** 「続きから」(進行中の星のレッスンを開く)。 */
  onResumeStage: (stageId: string) => void;
  /** 「ここから始める」(いま進める星に切り替える)。 */
  onStartStage: (stageId: string) => void;
  /** 「キューに追加」。 */
  onQueueStage: (stageId: string) => void;
  /** 腕試しを開く。 */
  onSkillCheck: (stageId: string) => void;
  /** 「レッスン一覧」(ステージ詳細を開く)。 */
  onOpenStage: (stageId: string) => void;
  /** 開発者モード: 段を素通しし、幽霊ノードも星として描く。 */
  revealDev?: boolean;
  /** 縮小したときに区域のまとめを出す (受講者ホーム用)。 */
  overview?: boolean;
  /**
   * 開いた直後に寄せる星 (現在地)。null なら入口の星座を見せる。
   * 最初に描けたときに 1 回だけ寄る — 再取得のたびに視点を奪わない。
   */
  initialFocusStageId?: string | null;
  /** 進行中の星の詳細カードに足す情報。 */
  activeInfo?: ActiveStarInfo | null;
  /** 操作ハンドルの受け口 (`SkillTreeCanvas` と同じ受け渡し)。 */
  handleRef?: RefObject<SkillTreeHandle | null>;
  /** 左端から浮いたカード (ホームのガイド) に覆われている幅 (px)。 */
  insetLeft?: number;
  /**
   * 星のポップオーバー / ボトムシートの、名前より下の中身。
   * 名前の見出しは SkillTree が描く (ポップオーバーは名前の行、シートは閉じるボタンと
   * 同じ行の `DrawerTitle`)。渡すと状態の行は出さず、受講者向けの本文とボタン
   * (`StarBody` / `StarActions`) の代わりにこれを描く。
   * `close` で器を閉じる。未指定なら受講者のホームと同じ。
   */
  renderDetail?: (node: SkillMapStageNode, close: () => void) => ReactNode;
  /** 星のアイコンの取り方。既定は受講者向けの `getSkillMapIcons`。 */
  loadIcons?: (signal: AbortSignal) => Promise<Record<string, string>>;
  /** 星の名前のそばに出す小さな札。読み上げにも足す。null なら出さない。 */
  starTag?: (node: SkillMapStageNode) => string | null;
  /**
   * 解放・登場の演出をするか。既定はする。
   * 管理画面は false — 全部の星が「新しく登場」にならないようにし、
   * 受講者の閲覧スナップショットも読まない・書かない。
   */
  celebrate?: boolean;
  /**
   * 島タイトルの 2 行目に ` · ` で足す文言。null か空なら「星雲 · n ステージ」だけ。
   */
  islandCaption?: (key: string) => string | null;
  /** 本土の見出し。既定は「開発スキル」。 */
  mainlandTitle?: string;
  /** 右上の島チップを出す。既定は出す。false のときはルート名が避ける障害物からも外す。 */
  showIslandChips?: boolean;
  /** 状態の凡例を出す。講師の管理画面では出さない。 */
  showLegend?: boolean;
  /**
   * 最初に描けたとき 1 回だけ全体表示にする。
   * true のときは `initialFocusStageId` へ寄せない。
   */
  initialFit?: boolean;
  selectedIslandKey?: string | null;
  onSelectIsland?: (key: string) => void;
  className?: string;
}

/** 島の枠とタイトルで、ルート色が無いときに使う色 (slate-300)。 */
const ISLAND_NEUTRAL = "203 213 225";

function islandAccentOf(key: string): string {
  return ROUTE_ACCENTS.get(key) ?? ISLAND_NEUTRAL;
}

/** ルート色を持つ扇の星に渡す CSS 変数 (index.css の tree-star-* が拾う)。 */
export function routeStyleOf(accent: string | undefined, solid: string | undefined): CSSProperties {
  if (!accent) return {};
  return {
    "--route-solid": solid ? `rgb(${solid})` : undefined,
    "--route-border": `rgb(${accent} / 0.95)`,
    "--route-halo": `rgb(${accent} / 0.16)`,
    "--route-open-glow": `rgb(${accent} / 0.5)`,
    "--route-border-dim": `rgb(${accent} / 0.45)`,
    "--route-glow": `rgb(${accent} / 0.28)`,
    "--route-glow-strong": `rgb(${accent} / 0.6)`,
  } as CSSProperties;
}

/** 島の星の中心の外接を、上・左・右 40px、下 56px (星の名前) 広げた枠。 */
function islandFrameOf(island: RadialIsland): RadialBounds {
  return {
    minX: island.bounds.minX - 40,
    maxX: island.bounds.maxX + 40,
    minY: island.bounds.minY - 40,
    maxY: island.bounds.maxY + 56,
  };
}

/**
 * 全体表示とパンの可動域。星の外接を全方向 70px、上だけ 110px
 * (島タイトルと本土の見出し) 広げ、盤面の外には出さない。
 */
function paddedContentBounds(bounds: RadialBounds, width: number, height: number): RadialBounds {
  const clampX = (value: number) => Math.min(Math.max(0, value), Math.max(0, width));
  const clampY = (value: number) => Math.min(Math.max(0, value), Math.max(0, height));
  return {
    minX: clampX(bounds.minX - 70),
    maxX: clampX(bounds.maxX + 70),
    minY: clampY(bounds.minY - 110),
    maxY: clampY(bounds.maxY + 70),
  };
}

/**
 * 画面上の星の直径が下限を下回らない拡大率。
 * 入口 (h-11 = 44px) は 30px、ほか (h-8 = 32px) は 24px。
 */
function starGrowOf(isCenter: boolean, scale: number): number {
  const s = scale > 0 ? scale : 1;
  return isCenter ? Math.max(1, 30 / (44 * s)) : Math.max(1, 24 / (32 * s));
}

function stageCountLine(count: number, extra: string | null | undefined): string {
  if (typeof extra === "string" && extra.length > 0) return `${count} ステージ · ${extra}`;
  return `${count} ステージ`;
}

/** 地名ラベルの逆スケール。画面上の大きさを倍率によらず保つ。 */
function placeScaleOf(scale: number): number {
  return Math.min(8, 1 / Math.max(0.05, scale));
}

/** 下辺中央を基準に、地名の見出しと説明を囲む画面 px の矩形。 */
function headingObstacle(title: string, detail: string | null, x: number, y: number) {
  const estimate = (text: string) =>
    Array.from(text).reduce((sum, char) => sum + (char.charCodeAt(0) <= 0x7f ? 7 : 11), 0);
  const w = Math.max(estimate(title), detail === null ? 0 : estimate(detail)) + 16;
  const h = detail === null ? 20 : 34;
  return { x: x - w / 2, y: y - h, w, h };
}

function PlaceHeading({
  title,
  detail,
  left,
  top,
  scale,
  titleClassName,
  titleColor,
  selected,
  onSelect,
}: {
  title: string;
  detail: string;
  left: number;
  top: number;
  scale: number;
  titleClassName?: string;
  titleColor?: string;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const Heading = onSelect ? "button" : "div";
  return (
    <Heading
      {...(onSelect
        ? {
            type: "button" as const,
            "aria-label": `${title}の詳細を開く`,
            "aria-pressed": selected,
            onClick: onSelect,
          }
        : {})}
      className={cn("absolute text-center", !onSelect && "pointer-events-none")}
      style={{
        left,
        top,
        transform: `translate(-50%, -100%) scale(${placeScaleOf(scale)})`,
        transformOrigin: "50% 100%",
      }}
    >
      <span
        className={cn(
          "block whitespace-nowrap text-[11px] font-bold tracking-wide",
          titleClassName,
        )}
        style={titleColor ? { color: titleColor } : undefined}
      >
        {title}
      </span>
      {scale >= LABEL_OVERVIEW_SCALE ? (
        <span className="tree-place-caption block whitespace-nowrap text-[9px] font-medium leading-tight">
          {detail}
        </span>
      ) : null}
    </Heading>
  );
}

/**
 * ステージアイコンを JWT 付きで 1 回取り、mask-image 用の blob URL にする。
 *
 * 公開 R2 URL を mask に直接渡すと CORS でマスクが透明になり、星の中身が空白になる。
 * 星ごとに取るとマップ評価 (D1) が N 回走るので、ツリー全体で 1 リクエストにする。
 * 届かない間・失敗したときは呼び出し側が状態グリフに落とす。
 *
 * 依存は `iconFetchKey` — 見える has_icon の集合か受講者が変わったら取り直す。
 * 空配列だと、腕試しで霧が開けても初回のバッチのままになる。
 */
function useStageIconUrls(
  fetchKey: string,
  loadIcons: (signal: AbortSignal) => Promise<Record<string, string>>,
): Map<string, string> {
  const [urls, setUrls] = useState<Map<string, string>>(() => new Map());
  // biome-ignore lint/correctness/useExhaustiveDependencies: fetchKey は再取得トリガー (URL は固定)
  useEffect(() => {
    if (!isApiConfigured()) return;
    const ac = new AbortController();
    let created: string[] = [];
    void loadIcons(ac.signal)
      .then((icons) => {
        if (ac.signal.aborted) return;
        const next = new Map<string, string>();
        created = [];
        for (const [id, svg] of Object.entries(icons)) {
          if (ac.signal.aborted) {
            for (const url of created) URL.revokeObjectURL(url);
            created = [];
            return;
          }
          const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
          created.push(url);
          next.set(id, url);
        }
        setUrls(next);
      })
      .catch(() => {
        if (!ac.signal.aborted) setUrls(new Map());
      });
    return () => {
      ac.abort();
      for (const url of created) URL.revokeObjectURL(url);
    };
  }, [fetchKey, loadIcons]);
  return urls;
}

/** クリックで寄せる倍率。全体表示からここに来ると名前が出る。 */
const FOCUS_SCALE = 1.25;
/** これ未満の倍率では、星の名前の代わりに区域のまとめを出す。 */
const OVERVIEW_SCALE = 0.6;
/** マウスを載せてからカードを開くまで (横切っただけの星で開かない)。 */
const CARD_OPEN_DELAY_MS = 120;
/** マウスが離れてからカードを閉じるまで (星からカードへ移る間に閉じない)。 */
const CARD_CLOSE_DELAY_MS = 200;
/** この倍率以上で、フォーカス中の星の名前を出す。 */
const LABEL_FOCUS_SCALE = 0.7;
/** この倍率以上で、すべての星の名前を出す。 */
const LABEL_ALL_SCALE = 1.2;
const LABEL_OVERVIEW_SCALE = 0.45;
/** この倍率以上で、見えているルート名を出す。星の名前の出し分けとは別。 */
const SECTOR_LABEL_MIN_SCALE = 0.35;

function showsAllLabels(scale: number): boolean {
  return scale >= LABEL_ALL_SCALE;
}

function showsFocusLabel(scale: number): boolean {
  return scale >= LABEL_FOCUS_SCALE;
}

/**
 * グラデーション定義の id に使える文字列にする。
 *
 * 端点は `instanceId` (ステージ UUID、複製は `id::扇`) なので、`::` と扇名 (日本語) が
 * そのまま入ると `url(#...)` の参照が壊れる。英数字以外を潰すだけで一意性は保たれる
 * (元が UUID なので衝突しない)。
 */
function fadeIdOf(key: string): string {
  return key.replace(/[^a-zA-Z0-9_-]/g, "_");
}

/** 線を星の核の縁で止める。中心まで引くと円を貫いて、中心から外れて見える。 */
function edgeEnds(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  r1: number,
  r2: number,
): { x1: number; y1: number; x2: number; y2: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len <= r1 + r2 + 1) return { x1, y1, x2, y2 };
  const ux = dx / len;
  const uy = dy / len;
  return {
    x1: x1 + ux * r1,
    y1: y1 + uy * r1,
    x2: x2 - ux * r2,
    y2: y2 - uy * r2,
  };
}

export const SkillTree = ({
  nodes,
  currentUserId,
  activeStageId,
  queuedStageIds,
  onResumeStage,
  onStartStage,
  onQueueStage,
  onSkillCheck,
  onOpenStage,
  revealDev = false,
  overview = false,
  initialFocusStageId = null,
  activeInfo = null,
  handleRef,
  insetLeft = 0,
  renderDetail,
  loadIcons = getSkillMapIcons,
  starTag,
  celebrate = true,
  islandCaption,
  mainlandTitle = "開発スキル",
  showIslandChips = true,
  showLegend = true,
  initialFit = false,
  selectedIslandKey = null,
  onSelectIsland,
  className,
}: SkillTreeProps) => {
  // 座標は星の集合が変わったときだけ計算し直す (ポップオーバーの開閉で組み直さない)。
  const layout = useMemo(() => layoutRadialSkillTree(nodes), [nodes]);
  const nextUnlocks = useMemo(() => nextUnlockIds(nodes, activeStageId), [nodes, activeStageId]);
  const activeTitle = nodes.find((node) => node.id === activeStageId)?.title ?? null;
  const contentBounds = useMemo(
    () => paddedContentBounds(layout.bounds, layout.width, layout.height),
    [layout],
  );
  const iconUrls = useStageIconUrls(iconFetchKey(currentUserId, nodes), loadIcons);
  // celebrate が false のときは userId を渡さない。フックはスナップショットを触らない。
  const celebrations = useSkillTreeCelebration(celebrate ? currentUserId : null, nodes);
  const canvasRef = useRef<SkillTreeCanvasHandle | null>(null);
  /** スマホ幅ではポップオーバーではなくボトムシートで詳細を出す。 */
  const isMobile = useIsMobileViewport();
  /** シートを開いている星 (instanceId)。複製した星は扇ごとに別の器として扱う。 */
  const [sheetId, setSheetId] = useState<string | null>(null);
  /** シートを閉じたときにフォーカスを戻す先の星。 */
  const sheetAnchorRef = useRef<HTMLButtonElement | null>(null);
  const [scale, setScale] = useState(1);
  const isOverview = overview && scale < OVERVIEW_SCALE;
  const regions = useMemo(
    () => summarizeRegions(layout, activeStageId, revealDev),
    [layout, activeStageId, revealDev],
  );
  /** 見え方 (画面端の矢印の計算用)。初回レンダー前は null。 */
  const [view, setView] = useState<ViewState | null>(null);
  /** クリックで寄せた星。全体表示へ戻すと消える。 */
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const handleScaleChange = useCallback((next: number) => {
    setScale(next);
    if (next < LABEL_FOCUS_SCALE) setFocusedId(null);
  }, []);
  /** 開いている詳細カード。`pinned` は押して開いたもので、マウスが離れても閉じない。 */
  const [card, setCard] = useState<{ id: string; pinned: boolean } | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(hoverTimerRef.current), []);

  /** マウスが星かカードに載った。固定中のカードは入れ替えない。 */
  const hoverCard = useCallback((id: string) => {
    clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      setCard((current) =>
        current?.pinned || current?.id === id ? current : { id, pinned: false },
      );
    }, CARD_OPEN_DELAY_MS);
  }, []);

  /** マウスが星とカードから離れた。 */
  const unhoverCard = useCallback(() => {
    clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      setCard((current) => (current?.pinned ? current : null));
    }, CARD_CLOSE_DELAY_MS);
  }, []);

  const closeCard = useCallback(() => {
    clearTimeout(hoverTimerRef.current);
    setCard(null);
  }, []);

  /** 押すと星へ寄せてカードを固定する。固定中にもう一度押すと閉じる。 */
  const pinCard = (placed: RadialNode) => {
    clearTimeout(hoverTimerRef.current);
    if (card?.id === placed.instanceId && card.pinned) {
      setCard(null);
      return;
    }
    canvasRef.current?.focusOn(placed.x, placed.y, FOCUS_SCALE);
    setFocusedId(placed.instanceId);
    setCard({ id: placed.instanceId, pinned: true });
  };
  /**
   * スマホ: タップ 1 回で寄せながらシートを開く。寄せるのはどの星を見ているかを
   * 盤面側でも示すため — シートは下端に出るので隠れない。
   */
  const openSheet = useCallback((placed: RadialNode, anchor: HTMLButtonElement) => {
    sheetAnchorRef.current = anchor;
    canvasRef.current?.focusOn(placed.x, placed.y, FOCUS_SCALE);
    setFocusedId(placed.instanceId);
    setSheetId(placed.instanceId);
  }, []);
  // 幅が変わって器が入れ替わったら、開きっぱなしのシートは畳む。
  useEffect(() => {
    if (!isMobile) setSheetId(null);
  }, [isMobile]);
  useEffect(() => {
    if (isMobile) closeCard();
  }, [isMobile, closeCard]);
  /** シートに出す星。教材の公開状況が変わって消えたら閉じる。 */
  const sheetNode = useMemo(
    () => (sheetId ? (layout.nodes.find((n) => n.instanceId === sheetId) ?? null) : null),
    [layout, sheetId],
  );
  /** 演出の順番 (複数の星が同時に開いたとき、内側から順に灯す)。 */
  const celebrationOrder = useMemo(() => {
    const order = new Map<string, number>();
    for (const placed of layout.nodes) {
      if (celebrations.has(placed.node.id)) order.set(placed.node.id, order.size);
    }
    return order;
  }, [layout, celebrations]);
  /** 星として描くか (幽霊ノードは線の終点でしかない)。 */
  const drawsStar = useCallback(
    (placed: RadialNode) => showsStar(placed.node.visibility, revealDev),
    [revealDev],
  );
  const drawnStars = useMemo(() => layout.nodes.filter(drawsStar), [layout, drawsStar]);
  const labelScale = Math.max(0.05, Math.round(scale / 0.05) * 0.05);
  const starRadius = useMemo(() => {
    const radii = new Map<string, number>();
    for (const placed of layout.nodes) {
      // 幽霊ノードには核が無いので、線をその座標ちょうどで終わらせる。
      // 描く星は核の拡大率を掛け、線を画面上の縁で止める。
      if (!drawsStar(placed)) {
        radii.set(placed.instanceId, 0);
        continue;
      }
      const base = placed.ring === 0 ? 22 : 16;
      radii.set(placed.instanceId, base * starGrowOf(placed.ring === 0, scale));
    }
    return radii;
  }, [layout, drawsStar, scale]);
  /** 幽霊ノードへ伸びる線 (= フェードさせる線) の端点。 */
  const ghostIds = useMemo(() => {
    const ids = new Set<string>();
    for (const placed of layout.nodes) {
      if (!drawsStar(placed)) ids.add(placed.instanceId);
    }
    return ids;
  }, [layout, drawsStar]);
  /**
   * ジャンプ先 (開発スキル = 中心のツリー + 島)。島は中心 1× の初期視点では視界の外
   * (中心から 1,000px 超) にあり、パンしなければ存在に気づけない。盤面の上のチップで
   * 直接飛べるようにし、視界の外にある間は画面端に方向の矢印も出す (`offscreenMarkers`)。
   *
   * 表示名は「本土」ではなく「開発スキル」— 隣に並ぶ島の名前 (AWS資格 / Anthropic認定資格 / Python / DevOps / C#)
   * が内容の名前なので、場所の名前を混ぜると凡例として読めない。
   *
   * 矢印は名前が全部出る倍率 (`showsAllLabels`) では消す — 寄って読んでいるときに
   * 縁の矢印と名前札が重なり、盤面の外の案内より目の前の星が優先だから。
   *
   * 判定は中心の点ではなく範囲。本土は `mainlandBounds`、島は枠。中心だけが
   * ガイドの陰に入っても、範囲が見えていれば矢印は出さない。
   */
  /**
   * 星が 1 つも描かれない島は、タイトルもジャンプ先も出さない。
   *
   * 島の中身が全部 3 歩以上先だと、島タイトルだけが何も無い所に浮かぶ (島の中では
   * 本土への線を引かないので、フェードする線すら出ない)。
   */
  const visibleIslands = useMemo(
    () =>
      layout.islands.filter((island) =>
        layout.nodes.some((n) => n.sector === island.key && drawsStar(n)),
      ),
    [layout, drawsStar],
  );
  const drawnCounts = useMemo(() => {
    const bySector = new Map<string, number>();
    const islandKeys = new Set(layout.islands.map((island) => island.key));
    let mainland = 0;
    for (const placed of layout.nodes) {
      if (!drawsStar(placed)) continue;
      bySector.set(placed.sector, (bySector.get(placed.sector) ?? 0) + 1);
      if (!islandKeys.has(placed.sector)) mainland += 1;
    }
    return { bySector, mainland };
  }, [layout, drawsStar]);
  const islandFrames = useMemo(
    () =>
      visibleIslands.map((island) => ({
        island,
        frame: islandFrameOf(island),
        count: drawnCounts.bySector.get(island.key) ?? 0,
      })),
    [visibleIslands, drawnCounts],
  );
  const showPlaceDetails = scale >= LABEL_OVERVIEW_SCALE;
  // 見出しの文言・星の数・説明行の表示が変わったら、札とルート名の両方を配置し直す。
  const placeHeadings = useMemo(
    () => [
      ...(layout.mainlandBounds && drawnCounts.mainland > 0
        ? [
            {
              title: mainlandTitle,
              detail: showPlaceDetails ? stageCountLine(drawnCounts.mainland, null) : null,
              x: (layout.mainlandBounds.minX + layout.mainlandBounds.maxX) / 2,
              y: layout.mainlandBounds.minY - 48,
            },
          ]
        : []),
      ...islandFrames.map(({ island, frame, count }) => ({
        title: island.key,
        detail: showPlaceDetails ? stageCountLine(count, islandCaption?.(island.key)) : null,
        x: (frame.minX + frame.maxX) / 2,
        y: frame.minY,
      })),
    ],
    [
      layout.mainlandBounds,
      drawnCounts.mainland,
      mainlandTitle,
      islandFrames,
      islandCaption,
      showPlaceDetails,
    ],
  );
  const labelSides = useMemo(() => {
    const stars = drawnStars.map((placed) => ({
      id: placed.instanceId,
      x: placed.x,
      y: placed.y,
      r: (placed.ring === 0 ? 22 : 16) * starGrowOf(placed.ring === 0, labelScale) * labelScale,
      label: labelOf(placed.node),
      extraHeight: (starTag?.(placed.node) ? 12 : 0) + (nextUnlocks.has(placed.node.id) ? 16 : 0),
      blockedSides:
        placed.node.id === activeStageId &&
        placed.node.state !== "cleared" &&
        placed.node.visibility === "full"
          ? (["above"] as StarLabelSide[])
          : [],
    }));
    const obstacles = [
      ...placeHeadings.map(({ title, detail, x, y }) =>
        headingObstacle(title, detail, x * labelScale, y * labelScale),
      ),
      ...stars.flatMap((star, index) => {
        if (!star.blockedSides.includes("above")) return [];
        const coreScale = starGrowOf(drawnStars[index].ring === 0, labelScale);
        // 「いまここ」の下端は核の縁 + 8px (核と同じ拡大率) + 6px (画面上)。
        return [
          {
            x: star.x * labelScale - 50,
            y: star.y * labelScale - star.r - 8 * coreScale * labelScale - 6 - 24,
            w: 100,
            h: 24,
          },
        ];
      }),
    ];
    return placeStarLabels(stars, labelScale, obstacles);
  }, [drawnStars, labelScale, starTag, placeHeadings, nextUnlocks, activeStageId]);
  const nextUnlockPaths = useMemo(() => {
    const activeStars = drawnStars.filter((star) => star.node.id === activeStageId);
    return drawnStars.flatMap((target) => {
      if (!nextUnlocks.has(target.node.id)) return [];
      const edge = layout.edges.find(
        (edge) =>
          edge.toId === target.instanceId &&
          activeStars.some((star) => star.instanceId === edge.fromId),
      );
      if (!edge) return [];
      const source = activeStars.find((star) => star.instanceId === edge.fromId);
      if (!source) return [];
      return [
        {
          id: target.instanceId,
          ends: edgeEnds(
            edge.x1,
            edge.y1,
            edge.x2,
            edge.y2,
            starRadius.get(source.instanceId) ?? 16,
            starRadius.get(target.instanceId) ?? 16,
          ),
        },
      ];
    });
  }, [drawnStars, activeStageId, nextUnlocks, layout.edges, starRadius]);
  const jumpTargets = useMemo(
    () => [
      {
        key: "開発スキル",
        x: layout.centerX,
        y: layout.centerY,
        ...(layout.mainlandBounds ? { rect: layout.mainlandBounds } : {}),
      },
      ...islandFrames.map(({ island, frame }) => ({
        key: island.key,
        x: island.cx,
        y: island.cy,
        rect: frame,
      })),
    ],
    [layout, islandFrames],
  );
  /**
   * 見えている範囲 = 浮いたカードの右側。画面端の矢印とルート名はこの範囲で計算し、
   * 置くときに `insetLeft` ぶん右へ戻す (カードの陰に矢印や名前を置かない)。
   */
  const visibleView = useMemo((): ViewState | null => {
    if (!view) return null;
    const inset = Math.max(0, Math.min(insetLeft, view.width - 240));
    return { ...view, x: view.x - inset, width: view.width - inset };
  }, [view, insetLeft]);
  const viewInset = view && visibleView ? view.width - visibleView.width : 0;
  const overviewLabels = useMemo(() => {
    if (!isOverview || !visibleView) return [];
    const estimateWidth = (text: string, fullWidth: number, asciiWidth: number) =>
      Array.from(text).reduce(
        (width, char) => width + (char.charCodeAt(0) <= 0x7f ? asciiWidth : fullWidth),
        0,
      );
    const cards = regions.flatMap((region) => {
      const cx = region.cx * visibleView.scale + visibleView.x;
      const cy = region.cy * visibleView.scale + visibleView.y;
      if (cx < 0 || cx > visibleView.width || cy < 0 || cy > visibleView.height) return [];
      const counts = [
        ...(region.cleared > 0 ? [`クリア ${region.cleared}`] : []),
        ...(region.active > 0 ? [`受講中 ${region.active}`] : []),
        ...(region.startable > 0 ? [`始められる ${region.startable}`] : []),
        ...(region.cleared + region.active + region.startable === 0
          ? [`ロック ${region.locked}`]
          : []),
      ].join(" · ");
      const current =
        region.active > 0
          ? `いまここ · ${region.activeTitle ?? ""}${activeInfo ? ` ${activeInfo.progress}%` : ""}`
          : null;
      const width = Math.min(
        220,
        visibleView.width - 16,
        Math.ceil(
          Math.max(
            estimateWidth(region.key, 16, 9.5),
            estimateWidth(counts, 11.5, 6.9),
            current ? estimateWidth(current, 11, 6.6) + 16 : 0,
          ),
        ) + 34,
      );
      return [
        {
          ...region,
          cx,
          cy,
          width,
          height: region.active > 0 ? 78 : 56,
          counts,
          current,
          regionTop: region.bounds.minY * visibleView.scale + visibleView.y,
          regionBottom: region.bounds.maxY * visibleView.scale + visibleView.y,
        },
      ];
    });
    // 安定した区分で、現在地の区域だけを先に配置する。
    const ordered = [
      ...cards.filter((card) => card.active > 0),
      ...cards.filter((card) => card.active === 0),
    ];
    const obstacles = [{ left: visibleView.width - 52, top: 8, width: 44, height: 120 }];
    if (showIslandChips && visibleIslands.length > 0) {
      const width = Math.min(460, visibleView.width - 72);
      obstacles.push({ left: visibleView.width - 52 - width, top: 8, width, height: 72 });
    }
    return placeOverviewCards(ordered, obstacles, visibleView).map((card) => ({
      ...card,
      left: card.left + viewInset,
    }));
  }, [
    isOverview,
    visibleView,
    viewInset,
    regions,
    activeInfo,
    showIslandChips,
    visibleIslands.length,
  ]);
  const markers = useMemo(
    () =>
      visibleView && !showsAllLabels(visibleView.scale)
        ? offscreenMarkers(jumpTargets, visibleView).map((m) => ({
            ...m,
            left: m.left + viewInset,
          }))
        : [],
    [jumpTargets, visibleView, viewInset],
  );
  /**
   * ルート名は盤面外周の固定点ではなく、いま見えている星のそばへ出す
   * (`sectorLabelsInView`)。本土の星をすべて障害物にし、扇だけに名前を出す。
   * 出している島チップとズームボタンは障害物として避け、オーバーレイに載せるので倍率で縮小しない。
   * 星の名前 (`showsAllLabels`) より低い倍率から出す。
   */
  const sectorLabels = useMemo(() => {
    if (isOverview || !visibleView || visibleView.scale < SECTOR_LABEL_MIN_SCALE) return [];
    const mainland = new Set(layout.sectors.map((s) => s.key));
    const islandKeys = new Set(layout.islands.map((island) => island.key));
    const parentIds = new Map(layout.edges.map((edge) => [edge.toId, edge.fromId]));
    const stars = layout.nodes
      .filter((n) => !islandKeys.has(n.sector) && drawsStar(n))
      .map((n) => ({
        id: n.instanceId,
        parentId: parentIds.get(n.instanceId),
        sector: n.sector,
        x: n.x,
        y: n.y,
        radius: n.ring === 0 ? 22 : 16,
      }));
    // 右上: ズームボタン (縦 3 つ) と、出すときだけその左の島チップ。
    const chipsW =
      showIslandChips && visibleIslands.length > 0 ? Math.min(460, visibleView.width - 72) : 0;
    const obstacles = [
      ...(showIslandChips
        ? [
            {
              left: Math.max(0, visibleView.width - 52 - chipsW),
              top: 8,
              width: chipsW,
              height: visibleIslands.length > 0 ? 56 : 0,
            },
          ]
        : []),
      { left: Math.max(0, visibleView.width - 52), top: 8, width: 44, height: 120 },
    ];
    // カードの右側を原点とする画面座標へ直す。
    for (const { title, detail, x, y } of placeHeadings) {
      const rect = headingObstacle(
        title,
        detail,
        x * visibleView.scale + visibleView.x,
        y * visibleView.scale + visibleView.y,
      );
      obstacles.push({ left: rect.x, top: rect.y, width: rect.w, height: rect.h });
    }
    return sectorLabelsInView(stars, visibleView, obstacles, mainland).map((label) => ({
      ...label,
      left: label.left + viewInset,
    }));
  }, [
    layout,
    visibleView,
    viewInset,
    drawsStar,
    visibleIslands,
    showIslandChips,
    placeHeadings,
    isOverview,
  ]);
  const jumpTo = useCallback((x: number, y: number) => {
    canvasRef.current?.focusOn(x, y, 1);
    setFocusedId(null);
  }, []);
  /** 線をルート色で塗るための、星 id → 扇キーの引き当て。 */
  const sectorOfId = useMemo(() => {
    const sectors = new Map<string, string>();
    for (const placed of layout.nodes) {
      sectors.set(placed.instanceId, placed.sector);
    }
    return sectors;
  }, [layout]);

  /**
   * 星 (ステージ id) へ寄せる。複製された星は最初に描いた器へ寄る。
   *
   * 寄せる倍率は「名前が出る」所まで — ガイドから飛んだ先で、どの星を指したのかが
   * 読めないと寄った意味が無い。
   */
  const focusStage = useCallback(
    (stageId: string, scale = FOCUS_SCALE): boolean => {
      const placed = layout.nodes.find((n) => n.node.id === stageId && drawsStar(n));
      if (!placed) return false;
      canvasRef.current?.focusOn(placed.x, placed.y, scale);
      setFocusedId(placed.instanceId);
      return true;
    },
    [layout, drawsStar],
  );
  const focusRegion = useCallback(
    (key: string): boolean => {
      let bounds: RadialBounds | null = null;
      if (key === mainlandTitle && drawnCounts.mainland > 0) bounds = layout.mainlandBounds;
      else if (
        drawnStars.some(
          (star) =>
            star.sector === key && !layout.islands.some((island) => island.key === star.sector),
        )
      ) {
        const stars = drawnStars.filter((star) => star.sector === key);
        if (stars.length > 0)
          bounds = {
            minX: Math.min(...stars.map((star) => star.x)) - 60,
            maxX: Math.max(...stars.map((star) => star.x)) + 60,
            minY: Math.min(...stars.map((star) => star.y)) - 60,
            maxY: Math.max(...stars.map((star) => star.y)) + 60,
          };
      } else bounds = islandFrames.find(({ island }) => island.key === key)?.frame ?? null;
      if (!bounds || !visibleView || !canvasRef.current) return false;
      const targetScale = Math.max(
        OVERVIEW_SCALE,
        Math.min(
          1.25,
          visibleView.width / Math.max(1, bounds.maxX - bounds.minX),
          visibleView.height / Math.max(1, bounds.maxY - bounds.minY),
        ),
      );
      // focusOn は拡大だけなので、縮小が必要なら先に全体表示へ戻す。
      // 同じ更新内で続けて寄せ、途中の全体表示は描画しない。
      if (visibleView.scale > targetScale && !canvasRef.current.fit()) return false;
      canvasRef.current.focusOn(
        (bounds.minX + bounds.maxX) / 2,
        (bounds.minY + bounds.maxY) / 2,
        targetScale,
      );
      setFocusedId(null);
      return true;
    },
    [mainlandTitle, drawnCounts.mainland, layout, drawnStars, islandFrames, visibleView],
  );
  const selectedBridge = useMemo(() => {
    const island = visibleIslands.find((island) => island.key === selectedIslandKey);
    const anchor = drawnStars.find((star) => star.instanceId === island?.anchorId);
    if (!island || !anchor) return null;
    const root = drawnStars.find(
      (star) => star.sector === island.key && star.x === island.cx && star.y === island.cy,
    );
    return {
      island,
      anchor,
      ends: edgeEnds(
        anchor.x,
        anchor.y,
        island.cx,
        island.cy,
        starRadius.get(anchor.instanceId) ?? 16,
        root ? (starRadius.get(root.instanceId) ?? 16) : 0,
      ),
    };
  }, [visibleIslands, selectedIslandKey, drawnStars, starRadius]);
  useEffect(() => {
    if (!handleRef) return;
    handleRef.current = { focusStage: (stageId) => focusStage(stageId), focusRegion };
    return () => {
      handleRef.current = null;
    };
  }, [handleRef, focusStage, focusRegion]);

  /**
   * 開いた直後は現在地の星へ寄せる (倍率は初期視点のまま)。
   * `initialFit` のときは全体表示を 1 回だけ行い、現在地へは寄せない。
   *
   * 1 回だけ — 星を始めたあとの取り直しや、FAB での段の切り替えのたびに視点が
   * 現在地へ引き戻されると、眺めている最中の場所を失う。箱の大きさが 0 のあいだは
   * 全体表示が何もしないので、視界が取れてからやり直す。
   */
  const initialViewDone = useRef(false);
  useLayoutEffect(() => {
    if (initialViewDone.current) return;
    if (initialFit) {
      // 箱の大きさが 0 のあいだは fit が何もしない。視界が届いてからやり直す。
      if (view && (view.width <= 0 || view.height <= 0)) return;
      if (canvasRef.current?.fit()) initialViewDone.current = true;
      return;
    }
    if (!initialFocusStageId) return;
    if (focusStage(initialFocusStageId, 1)) initialViewDone.current = true;
  }, [initialFit, initialFocusStageId, focusStage, view]);

  if (nodes.length === 0) {
    return (
      <div className={cn("px-4 py-10 text-center text-[12.5px] text-ink-3", className)}>
        まだスキルがありません。教材が公開されると、ここに現れます。
      </div>
    );
  }

  const chips =
    showIslandChips && visibleIslands.length > 0 ? (
      <nav className="flex flex-wrap justify-end gap-1" aria-label="地図の中を移動">
        {jumpTargets.map((target, index) => {
          const accent = routeAccentOf(target.key);
          return (
            <Fragment key={target.key}>
              <Button
                size="sm"
                variant="outline"
                className="tree-zoom-btn h-6 gap-1.5 px-2 text-[10.5px]"
                onClick={() => jumpTo(target.x, target.y)}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "inline-block rounded-full",
                    index === 0 ? "h-1.5 w-1.5" : "h-2.5 w-2.5",
                  )}
                  style={{
                    background:
                      index === 0
                        ? accent
                          ? `rgb(${accent})`
                          : "rgb(230 232 245 / 0.7)"
                        : `radial-gradient(circle, rgb(${islandAccentOf(target.key)}) 0%, rgb(${islandAccentOf(target.key)} / 0.2) 70%)`,
                  }}
                />
                {target.key}
              </Button>
            </Fragment>
          );
        })}
      </nav>
    ) : null;

  return (
    <SkillTreeCanvas
      worldWidth={layout.width}
      worldHeight={layout.height}
      homeX={layout.centerX}
      homeY={layout.centerY}
      contentBounds={contentBounds}
      handleRef={canvasRef}
      onScaleChange={handleScaleChange}
      onViewChange={setView}
      insetLeft={insetLeft}
      className={className}
      overlay={
        <>
          {showLegend && !isMobile ? (
            <aside
              className="tree-legend pointer-events-none absolute bottom-9 flex items-center gap-3 rounded-xl border px-3 py-2 text-xs"
              style={{ left: viewInset + 12 }}
              aria-label="凡例"
            >
              {[
                ["cleared", "クリア"],
                ["active", "進行中"],
                ["open", "始められる"],
                ["locked", "ロック"],
              ].map(([state, label]) => (
                <span key={state} className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className={`tree-legend-dot tree-legend-${state}`} aria-hidden="true" />
                  {label}
                </span>
              ))}
            </aside>
          ) : null}
          {overviewLabels.map((region) => (
            <button
              key={region.key}
              type="button"
              className="tree-overview-card absolute"
              style={
                {
                  left: region.left,
                  top: region.top,
                  maxWidth: visibleView ? Math.min(220, visibleView.width - 16) : 220,
                  height: region.height,
                  "--overview-solid": routeSolidOf(region.key)
                    ? `rgb(${routeSolidOf(region.key)})`
                    : "var(--brand)",
                  "--overview-accent": routeAccentOf(region.key)
                    ? `rgb(${routeAccentOf(region.key)})`
                    : "var(--brand)",
                } as CSSProperties
              }
              aria-label={`${region.key}に近づく（クリア ${region.cleared}・受講中 ${region.active}・始められる ${region.startable}）`}
              onClick={() => focusRegion(region.key)}
            >
              {region.current ? (
                <span className="tree-overview-current" title={region.current}>
                  {region.current}
                </span>
              ) : null}
              <span className="tree-overview-title" title={region.key}>
                {region.key}
              </span>
              <span className="tree-overview-counts" title={region.counts}>
                {region.counts}
              </span>
            </button>
          ))}
          {isOverview ? (
            <div
              className="tree-hint pointer-events-none absolute bottom-20 text-center text-[10.5px]"
              style={{ left: viewInset, width: visibleView?.width }}
            >
              全体の地図 · 近づくとツリー表示に切り替わります
            </div>
          ) : null}
          {sectorLabels.map((label) => {
            const accent = routeAccentOf(label.key);
            return (
              <div
                key={label.key}
                className="tree-sector-label pointer-events-none absolute whitespace-nowrap text-[11px] font-bold tracking-wide"
                style={{
                  left: label.left,
                  top: label.top,
                  transform: "translate(-50%, -50%)",
                  ...(accent ? { color: `rgb(${accent} / 0.9)` } : {}),
                }}
              >
                {label.key}
              </div>
            );
          })}
          {/* 右上: 島チップ。ズームボタン (Canvas 側) の左に並べ、左に浮くガイドの
              カードとは重ならない幅に収める。 */}
          {chips ? (
            <div
              className="absolute right-12 top-3 flex justify-end"
              style={{ maxWidth: `calc(100% - ${viewInset + 64}px)` }}
            >
              {chips}
            </div>
          ) : null}
          {markers.map((marker) => {
            const target = jumpTargets.find((t) => t.key === marker.key);
            if (!target) return null;
            const accent = routeAccentOf(marker.key);
            return (
              <button
                key={marker.key}
                type="button"
                className="tree-jump-arrow absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5 text-[9.5px] font-semibold"
                style={{
                  left: marker.left,
                  top: marker.top,
                  ...(accent ? { color: `rgb(${accent})` } : {}),
                }}
                aria-label={`${marker.key}へ移動`}
                onClick={() => jumpTo(target.x, target.y)}
              >
                <ArrowUp size={16} style={{ transform: `rotate(${marker.angle}deg)` }} />
                <span>{marker.key}</span>
              </button>
            );
          })}
          {/* 盤面に 1 つだけ置くボトムシート (スマホ幅のときの詳細)。Portal で body に出る
              ので、この位置は「盤面が持ち主」という意味だけ。 */}
          {isMobile ? (
            <StarSheet
              placed={sheetNode}
              activeStageId={activeStageId}
              queuedStageIds={queuedStageIds}
              revealDev={revealDev}
              anchorRef={sheetAnchorRef}
              onClose={() => setSheetId(null)}
              onResumeStage={onResumeStage}
              onStartStage={onStartStage}
              onQueueStage={onQueueStage}
              onSkillCheck={onSkillCheck}
              onOpenStage={onOpenStage}
              renderDetail={renderDetail}
              activeInfo={activeInfo}
              activeTitle={activeTitle}
            />
          ) : null}
        </>
      }
    >
      {islandFrames.map(({ island, frame }) => {
        const width = frame.maxX - frame.minX;
        const height = frame.maxY - frame.minY;
        const accent = islandAccentOf(island.key);
        return (
          <div
            key={`island-frame-${island.key}`}
            aria-hidden="true"
            className="tree-nebula pointer-events-none absolute"
            data-selected={selectedIslandKey === island.key}
            style={
              {
                left: frame.minX - 20,
                top: frame.minY - 20,
                width: width + 40,
                height: height + 40,
                "--nebula": accent,
              } as CSSProperties
            }
          >
            <span className="tree-nebula-spark" style={{ left: "22%", top: "68%" }} />
            <span className="tree-nebula-spark" style={{ left: "62%", top: "26%" }} />
            <span className="tree-nebula-spark" style={{ left: "80%", top: "60%" }} />
          </div>
        );
      })}
      <svg
        className="absolute inset-0"
        width={layout.width}
        height={layout.height}
        aria-hidden="true"
      >
        <title>前提のつながり</title>
        {isOverview
          ? regions
              .filter((region) => region.kind === "route")
              .map((region) => {
                const accent = routeAccentOf(region.key);
                const color = accent ? `rgb(${accent})` : "var(--brand)";
                return (
                  <ellipse
                    key={region.key}
                    cx={region.cx}
                    cy={region.cy}
                    rx={(region.bounds.maxX - region.bounds.minX) / 2}
                    ry={(region.bounds.maxY - region.bounds.minY) / 2}
                    style={{ fill: color, stroke: color }}
                    fillOpacity={0.06}
                    strokeOpacity={0.45}
                    strokeWidth={1.5}
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })
          : null}
        <defs>
          {/*
            充足した前提線の輝き。盤面が暗いので、線そのものだけでは沈む。
            filterUnits は userSpaceOnUse にする — 既定の objectBoundingBox だと、
            水平 / 垂直の線 (bbox の高さが 0) がフィルターごと消える。島の第 1
            リングは中心の左右に来ることがあり、本土の斜め線では起きない。
          */}
          <filter
            id="tree-edge-glow"
            filterUnits="userSpaceOnUse"
            x={0}
            y={0}
            width={layout.width}
            height={layout.height}
          >
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {selectedBridge ? (
          <line
            {...selectedBridge.ends}
            stroke={`rgb(${islandAccentOf(selectedBridge.island.key)} / 0.85)`}
            strokeWidth={2}
            strokeDasharray="2 5"
            strokeLinecap="round"
          />
        ) : null}
        {layout.edges.map((edge) => {
          const ends = edgeEnds(
            edge.x1,
            edge.y1,
            edge.x2,
            edge.y2,
            starRadius.get(edge.fromId) ?? 16,
            starRadius.get(edge.toId) ?? 16,
          );
          // 線は行き先の星のルート色で塗る (中心から出る線が、進む先のルートを示す)。
          const accent = routeAccentOf(sectorOfId.get(edge.toId) ?? "");
          // 幽霊ノード (3 歩先) に触れる線は、そちら側へ向かって透明になる。
          // 「道は続いているが、どこまで続くかは分からない」を線 1 本で言う表現。
          const fadeTo = ghostIds.has(edge.toId) ? "to" : ghostIds.has(edge.fromId) ? "from" : null;
          const key = `${edge.fromId}-${edge.toId}`;
          const stroke = accent
            ? `rgb(${accent} / ${edge.satisfied ? 0.95 : 0.5})`
            : "currentColor";
          if (fadeTo !== null) {
            const gradientId = `tree-edge-fade-${fadeIdOf(key)}`;
            return (
              <g key={key}>
                <defs>
                  <linearGradient
                    id={gradientId}
                    gradientUnits="userSpaceOnUse"
                    x1={fadeTo === "to" ? ends.x1 : ends.x2}
                    y1={fadeTo === "to" ? ends.y1 : ends.y2}
                    x2={fadeTo === "to" ? ends.x2 : ends.x1}
                    y2={fadeTo === "to" ? ends.y2 : ends.y1}
                  >
                    {/* 手前の星の縁は普通の未充足線と同じ濃さ。そこから 3 段で消す。 */}
                    <stop offset="0%" stopColor={stroke} stopOpacity={0.55} />
                    <stop offset="45%" stopColor={stroke} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={stroke} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <line
                  x1={ends.x1}
                  y1={ends.y1}
                  x2={ends.x2}
                  y2={ends.y2}
                  className="tree-edge-fade"
                  stroke={`url(#${gradientId})`}
                />
              </g>
            );
          }
          return (
            <line
              key={key}
              x1={ends.x1}
              y1={ends.y1}
              x2={ends.x2}
              y2={ends.y2}
              className={edge.satisfied ? "tree-edge-lit" : "tree-edge-dim"}
              style={
                accent ? { stroke: `rgb(${accent} / ${edge.satisfied ? 0.95 : 0.5})` } : undefined
              }
              filter="url(#tree-edge-glow)"
            />
          );
        })}
        {nextUnlockPaths.map(({ id, ends }) => (
          <g key={`next-unlock-${id}`} className="tree-next-unlock-path">
            <line {...ends} strokeWidth={12} strokeOpacity={0.22} strokeLinecap="round" />
            <line {...ends} strokeWidth={3} strokeDasharray="2 7" strokeLinecap="round" />
          </g>
        ))}
      </svg>

      {selectedBridge ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded bg-card/95 px-1.5 py-0.5 text-[10px] text-ink-2"
          style={{
            left: (selectedBridge.ends.x1 + selectedBridge.ends.x2) / 2,
            top: (selectedBridge.ends.y1 + selectedBridge.ends.y2) / 2,
            transform: `translate(-50%, -50%) scale(${placeScaleOf(scale)})`,
          }}
        >
          前提: {labelOf(selectedBridge.anchor.node)}
        </div>
      ) : null}
      {/* 通常表示の島タイトル。逆スケールで大きさを保ち、全体の地図では区域札に置き換える。 */}
      {!isOverview &&
        islandFrames.map(({ island, frame, count }) => (
          <PlaceHeading
            key={`island-title-${island.key}`}
            title={island.key}
            selected={selectedIslandKey === island.key}
            onSelect={onSelectIsland ? () => onSelectIsland(island.key) : undefined}
            detail={stageCountLine(count, islandCaption?.(island.key))}
            left={(frame.minX + frame.maxX) / 2}
            top={frame.minY}
            scale={scale}
            titleClassName="tree-sector-label"
            titleColor={`rgb(${islandAccentOf(island.key)} / 0.9)`}
          />
        ))}
      {!isOverview && layout.mainlandBounds && drawnCounts.mainland > 0 ? (
        <PlaceHeading
          title={mainlandTitle}
          detail={stageCountLine(drawnCounts.mainland, null)}
          left={(layout.mainlandBounds.minX + layout.mainlandBounds.maxX) / 2}
          top={layout.mainlandBounds.minY - 48}
          scale={scale}
          titleClassName="tree-mainland-label"
        />
      ) : null}

      {drawnStars.map((placed) => (
        <StarNode
          key={placed.instanceId}
          placed={placed}
          isActive={placed.node.id === activeStageId}
          isNextUnlock={nextUnlocks.has(placed.node.id)}
          activeTitle={activeTitle}
          activeProgress={activeInfo?.progress}
          queued={queuedStageIds.includes(placed.node.id)}
          showCurrentLabel={!isOverview}
          showLabel={
            !isOverview &&
            ((scale >= LABEL_OVERVIEW_SCALE && labelSides.get(placed.instanceId) !== "hidden") ||
              (placed.instanceId === focusedId && showsFocusLabel(scale)))
          }
          labelSide={labelSides.get(placed.instanceId) ?? "below"}
          scale={scale}
          coreScale={starGrowOf(placed.ring === 0, scale)}
          celebration={celebrations.get(placed.node.id)}
          celebrationIndex={celebrationOrder.get(placed.node.id) ?? 0}
          iconUrl={
            placed.node.visibility === "full" && placed.node.has_icon
              ? (iconUrls.get(placed.node.id) ?? null)
              : null
          }
          cardOpen={card?.id === placed.instanceId}
          cardPinned={card?.id === placed.instanceId && card.pinned}
          onHoverCard={() => hoverCard(placed.instanceId)}
          onUnhoverCard={unhoverCard}
          onPinCard={() => pinCard(placed)}
          onCloseCard={closeCard}
          activeInfo={placed.node.id === activeStageId ? activeInfo : null}
          sheetMode={isMobile}
          sheetOpen={sheetId === placed.instanceId}
          onOpenSheet={(anchor) => openSheet(placed, anchor)}
          onResumeStage={onResumeStage}
          onStartStage={onStartStage}
          onQueueStage={onQueueStage}
          onSkillCheck={onSkillCheck}
          onOpenStage={onOpenStage}
          revealDev={revealDev}
          tag={starTag?.(placed.node) ?? null}
          renderDetail={renderDetail}
        />
      ))}
    </SkillTreeCanvas>
  );
};

interface StarNodeProps {
  placed: RadialNode;
  isActive: boolean;
  isNextUnlock: boolean;
  activeTitle: string | null;
  activeProgress?: number;
  queued: boolean;
  /** 名前札を出すか。 */
  showLabel: boolean;
  showCurrentLabel: boolean;
  labelSide: StarLabelSide;
  scale: number;
  /**
   * 核 (`tree-star`) の拡大率。画面上の直径が下限を下回らないようにする。
   * ボタンの位置は変えない。1 のときは transform を付けない。
   */
  coreScale: number;
  /** 差分で検出した演出 (「解放」/「出現」)。undefined なら演出なし。 */
  celebration: CelebrationKind | undefined;
  /** 複数の演出を内側から順に灯すための順番。 */
  celebrationIndex: number;
  /**
   * ステージアイコンの blob URL。無い / 届いていないときは状態グリフ。
   * full の星だけ親が渡す。ロックは鍵の印を添え、霧には渡さない。
   */
  iconUrl: string | null;
  /** この星の詳細カードが開いているか。 */
  cardOpen: boolean;
  /** 押して開いたカードか。マウスが離れても閉じない。 */
  cardPinned: boolean;
  /** マウスが星かカードに載った (タッチは含まない)。 */
  onHoverCard: () => void;
  /** マウスが星とカードから離れた。 */
  onUnhoverCard: () => void;
  /** 押した (マウス・タブレットのタップ・キーボードの Enter)。寄せてカードを固定する。 */
  onPinCard: () => void;
  /** カードを閉じる (カードの外・Esc・ボタンを押したあと)。 */
  onCloseCard: () => void;
  /** 進行中の星なら、カードに足す進捗と次のレッスン。それ以外は null。 */
  activeInfo: ActiveStarInfo | null;
  /** スマホ幅か。true ならポップオーバーを持たず、盤面のボトムシートを開く。 */
  sheetMode: boolean;
  /** この星のシートが開いているか (`aria-expanded` に写す)。 */
  sheetOpen: boolean;
  /** シートを開く。閉じたあとフォーカスを戻せるよう、押した星そのものを渡す。 */
  onOpenSheet: (anchor: HTMLButtonElement) => void;
  onResumeStage: (stageId: string) => void;
  onStartStage: (stageId: string) => void;
  onQueueStage: (stageId: string) => void;
  onSkillCheck: (stageId: string) => void;
  onOpenStage: (stageId: string) => void;
  revealDev: boolean;
  /** 名前のそばの札。null なら受講者のホームと同じ名前札だけ。 */
  tag: string | null;
  renderDetail?: (node: SkillMapStageNode, close: () => void) => ReactNode;
}

const StarNode = ({
  placed,
  isActive,
  isNextUnlock,
  activeTitle,
  activeProgress,
  queued,
  showLabel,
  showCurrentLabel,
  labelSide,
  scale,
  coreScale,
  celebration,
  celebrationIndex,
  iconUrl,
  cardOpen,
  cardPinned,
  onHoverCard,
  onUnhoverCard,
  onPinCard,
  onCloseCard,
  activeInfo,
  sheetMode,
  sheetOpen,
  onOpenSheet,
  onResumeStage,
  onStartStage,
  onQueueStage,
  onSkillCheck,
  onOpenStage,
  revealDev,
  tag,
  renderDetail,
}: StarNodeProps) => {
  const node = placed.node;
  const detail = describeStar({ node, isActive, queued, revealDev });
  const fog = node.visibility === "fog";
  const cleared = node.state === "cleared";
  const locked = node.state === "locked";
  const isCenter = placed.ring === 0;
  const full = node.visibility === "full";
  const active = isActive && !cleared && full;
  const progress = activeInfo ? Math.max(0, Math.min(100, activeInfo.progress)) : 0;
  const routeStyle = routeStyleOf(routeAccentOf(placed.sector), routeSolidOf(placed.sector));
  // full の星は mask + currentColor でアイコンを表示し、ロックには鍵の印を添える。
  // 画像が届くまでは状態グリフを使い、霧は従来の見た目を保つ。

  const act = (run: () => void) => {
    onCloseCard();
    run();
  };

  // 閉じたあとには読めないので、開いている間の「固定か」を控える。
  const pinnedRef = useRef(false);
  if (cardOpen) pinnedRef.current = cardPinned;

  // 見た目をぼかしている星は読み上げにも実名を流さない (Issue #272)。ぼかしが演出で
  // あっても、画面で読めない名前がスクリーンリーダーにだけ届くのは情報設計として
  // ちぐはぐで、「まだ見えない」という状態そのものが伝わらない。
  const spokenLabel = detail.obscured
    ? node.visibility !== "full"
      ? "まだ見えないスキル"
      : "名前の伏せられたスキル"
    : detail.label;

  const side = labelSide === "hidden" ? "below" : labelSide;
  const radius = (isCenter ? 22 : 16) * coreScale;
  const gap = radius + 4 / scale;
  const labelStyle: CSSProperties = {
    width: Math.min(140, estimateStarLabelWidth(detail.label)),
    textAlign: side === "right" ? "left" : side === "left" ? "right" : "center",
    left:
      side === "right" ? `calc(50% + ${gap}px)` : side === "left" ? `calc(50% - ${gap}px)` : "50%",
    top:
      side === "below" ? `calc(50% + ${gap}px)` : side === "above" ? `calc(50% - ${gap}px)` : "50%",
    transform: `${side === "below" ? "translateX(-50%)" : side === "above" ? "translate(-50%, -100%)" : side === "right" ? "translateY(-50%)" : "translate(-100%, -50%)"} scale(${1 / scale})`,
    transformOrigin:
      side === "below"
        ? "50% 0%"
        : side === "above"
          ? "50% 100%"
          : side === "right"
            ? "0% 50%"
            : "100% 50%",
  };

  const star = (
    <button
      data-testid={node.slug ? `tree-star-${node.slug}` : undefined}
      data-active={isActive}
      type="button"
      aria-label={`${spokenLabel}（${detail.stateText}${isNextUnlock ? "・次に解放" : ""}${tag ? `・${tag}` : ""}${celebration === "unlocked" ? "・新しく解放" : celebration === "appeared" ? "・新しく登場" : ""}）`}
      // スマホでは PopoverTrigger を通さないので、開閉の状態は自分で伝える。
      // (sm 以上では Radix が同じ属性を付けるため、こちらからは触らない —
      //  `undefined` でも鍵があると Slot の合成で上書きしてしまう。)
      {...(sheetMode
        ? {
            "aria-haspopup": "dialog" as const,
            "aria-expanded": sheetOpen,
            onClick: (event: ReactMouseEvent<HTMLButtonElement>) =>
              onOpenSheet(event.currentTarget),
          }
        : {})}
      // フォーカス追従 (SkillTreeCanvas の onFocusCapture) 用の盤面座標。
      data-tree-x={placed.x}
      data-tree-y={placed.y}
      className={cn(
        "absolute -translate-x-1/2 -translate-y-1/2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        celebration === "appeared" ? "tree-appear" : "",
      )}
      style={
        {
          left: placed.x,
          top: placed.y,
          "--d": celebrationIndex * 0.2,
          ...routeStyle,
        } as CSSProperties
      }
    >
      <span className="relative block" aria-hidden="true">
        {/* 解放の瞬間: 広がる輪 2 本 + 星の弾み。1 回きり (celebration は差分でしか立たない)。 */}
        {celebration === "unlocked" ? (
          <>
            <span className="tree-burst" />
            <span className="tree-burst tree-burst-late" />
          </>
        ) : null}
        <span
          className={cn(
            "tree-star relative grid place-items-center rounded-full border transition-colors",
            isCenter ? "h-11 w-11" : "h-8 w-8",
            !full
              ? "tree-star-fog"
              : cleared
                ? "tree-star-cleared"
                : isActive
                  ? "tree-star-active"
                  : node.state === "unlocked"
                    ? "tree-star-open"
                    : "tree-star-locked",
            fog && detail.obscured ? "opacity-45" : fog ? "opacity-70" : "",
            celebration === "unlocked" ? "tree-unlock-pop" : "",
          )}
          style={coreScale > 1 ? { transform: `scale(${coreScale})` } : undefined}
        >
          {active ? (
            <span
              className="tree-progress-ring"
              style={{ "--tree-progress": `${progress}%` } as CSSProperties}
            />
          ) : null}
          {iconUrl ? (
            <span
              className="tree-star-icon"
              style={
                {
                  width: isCenter ? 22 : 16,
                  height: isCenter ? 22 : 16,
                  "--star-icon": `url("${iconUrl}")`,
                } as CSSProperties
              }
            />
          ) : cleared ? (
            <Star size={isCenter ? 18 : 14} fill="currentColor" />
          ) : isActive ? (
            <Play size={isCenter ? 16 : 12} />
          ) : locked ? (
            <Lock size={isCenter ? 14 : 11} />
          ) : (
            <Sparkles size={isCenter ? 16 : 12} />
          )}
          {full && (cleared || (locked && iconUrl)) ? (
            <span
              className={cn("tree-state-badge", locked && "tree-state-badge-locked")}
              style={{ width: isCenter ? 18 : 16, height: isCenter ? 18 : 16 }}
              aria-hidden="true"
            >
              {cleared ? (
                <Check size={isCenter ? 12 : 10} strokeWidth={3} />
              ) : (
                <Lock size={isCenter ? 11 : 10} strokeWidth={2.5} />
              )}
            </span>
          ) : null}
        </span>
        {isNextUnlock ? (
          <svg
            aria-hidden="true"
            className="tree-next-unlock-ring pointer-events-none absolute overflow-visible"
            style={{ left: "50%", top: "50%" }}
            width={0}
            height={0}
          >
            <circle r={radius + 8} fill="none" strokeWidth={2} strokeDasharray="4 4" />
          </svg>
        ) : null}
        {active && showCurrentLabel ? (
          <span
            className="tree-current-pill pointer-events-none absolute whitespace-nowrap rounded-full px-2 py-1 text-[11px] font-bold leading-none"
            style={{
              left: "50%",
              bottom: `calc(50% + ${radius + 8 * coreScale + 6 / scale}px)`,
              transform: `translateX(-50%) scale(${1 / scale})`,
              transformOrigin: "50% 100%",
            }}
            aria-hidden="true"
          >
            いまここ{activeInfo ? ` ${progress}%` : ""}
          </span>
        ) : null}
        {showLabel ? (
          <span
            className="pointer-events-none absolute z-10 flex flex-col items-center text-center"
            style={labelStyle}
          >
            <span
              className={cn(
                "tree-star-label-chip w-full",
                isActive ? "tree-star-label-active" : "tree-star-label",
                detail.obscured ? "tree-star-label-fog blur-[1.5px] select-none" : "",
              )}
            >
              <span className="line-clamp-2">{detail.label}</span>
            </span>
            {isNextUnlock ? <span className="tree-next-unlock-pill">次に解放</span> : null}
            {tag ? (
              <span className="mt-0.5 rounded-full bg-card/95 px-1 py-px text-[7px] font-semibold leading-none text-ink-2 ring-1 ring-border">
                {tag}
              </span>
            ) : null}
          </span>
        ) : null}
        {celebration ? (
          <span className="tree-new-badge" aria-hidden="true">
            {celebration === "unlocked" ? "解放!" : "NEW"}
          </span>
        ) : null}
      </span>
    </button>
  );

  // スマホ幅: 詳細は盤面のボトムシートが受け持つので、星はただのボタン。
  if (sheetMode) {
    return star;
  }

  return (
    <Popover
      open={cardOpen}
      onOpenChange={(next) => {
        // Esc とカードの外を押したとき。開くのはホバーと押下だけ。
        if (!next) onCloseCard();
      }}
    >
      <PopoverTrigger
        asChild
        onClick={(event) => {
          event.preventDefault();
          onPinCard();
        }}
        onPointerEnter={(event) => {
          if (event.pointerType !== "touch") onHoverCard();
        }}
        onPointerLeave={(event) => {
          if (event.pointerType !== "touch") onUnhoverCard();
        }}
      >
        {star}
      </PopoverTrigger>

      <PopoverContent
        align="center"
        side="right"
        className={renderDetail ? "max-h-[min(70vh,32rem)] w-[300px] overflow-y-auto" : "w-[280px]"}
        onPointerEnter={(event) => {
          if (event.pointerType !== "touch") onHoverCard();
        }}
        onPointerLeave={(event) => {
          if (event.pointerType !== "touch") onUnhoverCard();
        }}
        // ホバーで開いた間はフォーカスを動かさない。星へ戻すと盤面のフォーカス追従がパンしてしまう。
        onOpenAutoFocus={(event) => {
          if (!cardPinned) event.preventDefault();
        }}
        onCloseAutoFocus={(event) => {
          if (!pinnedRef.current) event.preventDefault();
        }}
      >
        <div className="text-[13px] font-semibold leading-snug">
          {detail.obscured ? (
            <>
              {/* 名前はぼかしの予告だけ。読み上げには「まだ見えない」ことだけを流す。 */}
              <span aria-hidden="true" className="blur-[3px] select-none">
                {detail.label}
              </span>
              <span className="sr-only">
                {node.visibility !== "full" ? "まだ見えないスキル" : "名前の伏せられたスキル"}
              </span>
            </>
          ) : (
            detail.label
          )}
        </div>
        {renderDetail ? (
          <div className="mt-2">{renderDetail(node, onCloseCard)}</div>
        ) : (
          <>
            <div className="mt-0.5 text-[11px] text-ink-3">{detail.stateText}</div>
            {activeInfo ? <StarActiveInfo info={activeInfo} className="mt-2" /> : null}
            <StarBody
              detail={detail}
              size="sm"
              className="mt-2"
              activeTitle={activeTitle}
              activeProgress={activeProgress}
            />

            {hasStarActions(detail.actions) ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <StarActions
                  detail={detail}
                  stageId={node.id}
                  size="sm"
                  onAct={act}
                  onResumeStage={onResumeStage}
                  onStartStage={onStartStage}
                  onQueueStage={onQueueStage}
                  onSkillCheck={onSkillCheck}
                  onOpenStage={onOpenStage}
                  openTask={activeInfo?.openTask}
                />
              </div>
            ) : null}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
};

interface StarSheetProps {
  /**
   * 開いている星。閉じている間は null。閉じるアニメーションの間も中身が要るので、
   * 直前に開いていた星をこちらで覚えておく。
   */
  placed: RadialNode | null;
  activeStageId: string | null;
  activeTitle: string | null;
  queuedStageIds: string[];
  revealDev: boolean;
  /** 閉じたときにフォーカスを戻す星。 */
  anchorRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onResumeStage: (stageId: string) => void;
  onStartStage: (stageId: string) => void;
  onQueueStage: (stageId: string) => void;
  onSkillCheck: (stageId: string) => void;
  onOpenStage: (stageId: string) => void;
  renderDetail?: (node: SkillMapStageNode, close: () => void) => ReactNode;
  /** 進行中の星の詳細カードに足す情報。 */
  activeInfo?: ActiveStarInfo | null;
}

/**
 * スマホ幅の詳細 — 画面下から出るドロワー。
 *
 * ポップオーバーと違って盤面と重ならない場所に必ず出るので、指で押した星が自分の指と
 * シートの下に隠れない。中身 (名前・状態・本文・ボタン) は `star-detail.ts` の記述を
 * ポップオーバーと共有し、器だけが違う。
 */
const StarSheet = ({
  placed,
  activeStageId,
  activeTitle,
  queuedStageIds,
  revealDev,
  anchorRef,
  onClose,
  onResumeStage,
  onStartStage,
  onQueueStage,
  onSkillCheck,
  onOpenStage,
  renderDetail,
  activeInfo = null,
}: StarSheetProps) => {
  const lastRef = useRef<RadialNode | null>(null);
  /**
   * 腕試し (別のモーダル) へ渡して閉じたか。
   *
   * `SkillCheckDialog` は z-50 で開くのに対し、このシートの overlay は z-[100]。
   * 閉じアニメーションの 200ms のあいだ overlay が受験画面の上に残り、その間の
   * タップを飲んでしまう。渡したときは**アニメーションを省いて即座に畳み**、
   * フォーカスも星へ戻さない (開いたダイアログの focus trap と取り合いになる)。
   * 着手・キューは次のモーダルが無いので、従来どおり滑らせて閉じる。
   */
  const handedOffRef = useRef(false);
  if (placed) {
    lastRef.current = placed;
    handedOffRef.current = false;
  }
  const shown = placed ?? lastRef.current;
  if (!shown || (!placed && handedOffRef.current)) return null;

  const node = shown.node;
  const isActive = node.id === activeStageId;
  const detail = describeStar({
    node,
    isActive,
    queued: queuedStageIds.includes(node.id),
    revealDev,
  });
  const act = (run: () => void) => {
    onClose();
    run();
  };
  // `act` は閉じてから実行するので、印はここで立てる (どちらも同じイベントの中なので、
  // シートが畳まれるレンダーからは立った状態で見える)。
  const handOffToSkillCheck = (stageId: string) => {
    handedOffRef.current = true;
    onSkillCheck(stageId);
  };

  return (
    <Drawer
      open={placed !== null}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DrawerContent
        className="max-h-[80dvh]"
        onCloseAutoFocus={(event) => {
          // 次のモーダルへ渡したときは、そちらが当てたフォーカスを奪わない。
          if (handedOffRef.current) {
            event.preventDefault();
            return;
          }
          // この器にトリガーは無い (星を押したのは盤面) ので、戻す先は自分で指す。
          // 任せると body に落ちて、次の Tab がヘッダーの先頭から始まってしまう。
          const target = anchorRef.current;
          if (target) {
            event.preventDefault();
            target.focus();
          }
        }}
      >
        <DrawerHeader className="flex-row items-start gap-2">
          <div className="min-w-0 flex-1">
            <DrawerTitle className="text-[15px] leading-snug">
              {detail.obscured ? (
                <>
                  {/* 名前はぼかしの予告だけ。読み上げには状態語だけを流す。 */}
                  <span aria-hidden="true" className="blur-[3px] select-none">
                    {detail.label}
                  </span>
                  <span className="sr-only">
                    {node.visibility !== "full" ? "まだ見えないスキル" : "名前の伏せられたスキル"}
                  </span>
                </>
              ) : (
                detail.label
              )}
            </DrawerTitle>
            {renderDetail ? (
              <DrawerDescription className="sr-only">ステージの操作</DrawerDescription>
            ) : (
              <DrawerDescription className="mt-0.5">{detail.stateText}</DrawerDescription>
            )}
          </div>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon-sm" aria-label="閉じる">
              <X size={14} />
            </Button>
          </DrawerClose>
        </DrawerHeader>

        {renderDetail ? (
          <div className="overflow-y-auto px-4 pb-4">{renderDetail(node, onClose)}</div>
        ) : (
          <>
            <div className="overflow-y-auto px-4 py-3">
              {isActive && activeInfo ? (
                <StarActiveInfo info={activeInfo} className="mb-3" />
              ) : null}
              <StarBody
                detail={detail}
                size="md"
                activeTitle={activeTitle}
                activeProgress={activeInfo?.progress}
              />
            </div>

            {hasStarActions(detail.actions) ? (
              // 器の既定は下から積む (`flex-col-reverse`) が、ここは読む順 = 並ぶ順にする。
              <DrawerFooter className="flex-col">
                <StarActions
                  detail={detail}
                  stageId={node.id}
                  size="full"
                  onAct={act}
                  onResumeStage={onResumeStage}
                  onStartStage={onStartStage}
                  onQueueStage={onQueueStage}
                  onSkillCheck={handOffToSkillCheck}
                  onOpenStage={onOpenStage}
                  openTask={isActive ? activeInfo?.openTask : undefined}
                />
              </DrawerFooter>
            ) : null}
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
};

/** 進行中の星の進捗と次のレッスン。ポップオーバーとドロワーで共有する。 */
const StarActiveInfo = ({ info, className }: { info: ActiveStarInfo; className?: string }) => (
  <div className={className}>
    <div className="flex items-center gap-2">
      <Progress value={info.progress} tone="brand" className="flex-1" />
      <span className="text-[10.5px] tabular-nums text-ink-3">{info.progress}%</span>
    </div>
    <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-2">{info.detail}</p>
  </div>
);

/** 詳細の本文 (予告 / 解放条件 / 到達説明)。器を跨いで同じ文面を出す。 */
const StarBody = ({
  detail,
  size,
  className,
  activeTitle,
  activeProgress,
}: {
  detail: StarDetail;
  activeTitle: string | null;
  activeProgress?: number;
  /** `md` はドロワー (スマホで読む文字)、`sm` はポップオーバー。 */
  size: "sm" | "md";
  className?: string;
}) => {
  const text = size === "md" ? "text-[13px]" : "text-[12px]";
  const body = detail.body;
  if (body.kind === "fog") {
    return (
      <p className={cn(text, "text-ink-3", className)}>
        まだ先のスキルです。手前のスキルを進めるとはっきり見えてきます。
      </p>
    );
  }
  if (body.kind === "lock") {
    const occurrences = new Map<string, number>();
    const reasons = body.reasons.map((reason) => {
      const count = (occurrences.get(reason) ?? 0) + 1;
      occurrences.set(reason, count);
      return { reason, key: JSON.stringify([reason, count]) };
    });
    return (
      <div className={cn(text, "text-ink-3", className)}>
        {body.reasons.length > 0 ? (
          <>
            <div className="font-bold text-ink-2">解放まであと {body.reasons.length} つ</div>
            <ul className="mt-0.5 space-y-1">
              {reasons.map(({ reason, key }) => (
                <li key={key}>
                  {reason}
                  {reason === activeTitle && activeProgress !== undefined
                    ? `（いま ${Math.max(0, Math.min(100, activeProgress))}%）`
                    : ""}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div>{body.text}</div>
        )}
      </div>
    );
  }
  if (body.kind === "can-do") {
    return (
      <p className={cn(text, "text-ink-3", className)}>
        このスキルを身につけた人は <strong className="text-ink-2">{body.text}</strong>。
      </p>
    );
  }
  return null;
};

interface StarActionsProps {
  detail: StarDetail;
  stageId: string;
  /** `full` は幅いっぱい (ドロワー)、`sm` は行に流す (ポップオーバー)。 */
  size: "sm" | "full";
  /** 器を閉じてから実行する。 */
  onAct: (run: () => void) => void;
  onResumeStage: (stageId: string) => void;
  onStartStage: (stageId: string) => void;
  onQueueStage: (stageId: string) => void;
  onSkillCheck: (stageId: string) => void;
  onOpenStage: (stageId: string) => void;
  /** 受講者の番の課題が残っているとき、「続きから」の代わりに出す。 */
  openTask?: () => void;
}

/**
 * 詳細のボタン列。並びは器を跨いで同じで、器が外側の箱だけを決める。
 *
 * 先頭がその星の主な一手 (続きから / ここから始める / 飛び級) で、強調はそこだけ。
 */
export const StarActions = ({
  detail,
  stageId,
  size,
  onAct,
  onResumeStage,
  onStartStage,
  onQueueStage,
  onSkillCheck,
  onOpenStage,
  openTask,
}: StarActionsProps) => {
  const { skillCheck, resume, start, queue, openStage, clearedNote } = detail.actions;
  return (
    <>
      {resume ? (
        <Button
          size={size}
          variant="accent"
          onClick={() => onAct(openTask ?? (() => onResumeStage(stageId)))}
        >
          <Play size={12} />
          {openTask ? "課題に取り組む" : "続きから"}
        </Button>
      ) : null}

      {start ? (
        <Button
          data-testid="tree-start-stage"
          size={size}
          variant="accent"
          onClick={() => onAct(() => onStartStage(stageId))}
        >
          <Play size={12} />
          ここから始める
        </Button>
      ) : null}

      {skillCheck === "challenge" ? (
        <Button size={size} variant="accent" onClick={() => onAct(() => onSkillCheck(stageId))}>
          <Sparkles size={12} />
          腕試しに挑戦（飛び級）
        </Button>
      ) : skillCheck === "try" ? (
        <Button size={size} variant="outline" onClick={() => onAct(() => onSkillCheck(stageId))}>
          腕試しで力試し
        </Button>
      ) : null}

      {openStage ? (
        <Button
          data-testid="tree-open-stage"
          size={size}
          variant="outline"
          onClick={() => onAct(() => onOpenStage(stageId))}
        >
          <Book size={12} />
          レッスン一覧
        </Button>
      ) : null}

      {queue ? (
        <Button size={size} variant="ghost" onClick={() => onAct(() => onQueueStage(stageId))}>
          <Plus size={12} />
          キューに追加
        </Button>
      ) : null}

      {clearedNote ? (
        <span className="inline-flex items-center justify-center gap-1 self-center text-[11.5px] text-ink-3">
          <Check size={12} />
          このスキルは修了済み
        </span>
      ) : null}
    </>
  );
};
