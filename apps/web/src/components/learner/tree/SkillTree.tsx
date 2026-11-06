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
 * 島の名前は星団の上のタイトルとジャンプチップ・端の矢印で示す。島の範囲は角の丸い枠。
 *
 * ## 詳細の器は幅で入れ替える
 *
 * 星をタップ / クリックしたときに出す詳細は、sm 以上ではその星に紐づくポップオーバー、
 * スマホ幅 (`useIsMobileViewport`) では画面下から出るドロワー。スマホでポップオーバーを
 * 出すと、星が盤面の transform の中にあるぶん指の下に潜り込み、幅も画面に対して大きすぎて
 * 位置が定まらない。ドロワーなら盤面と重ならない場所に必ず出て、指の届く下端にボタンが並ぶ。
 * **何を出すかは器ではなく `star-detail.ts` が決める** (器ごとに条件を書くとずれる)。
 *
 * ドロワーは星ごとに持たせず盤面に 1 つだけ置き、開いている星を id で指す
 * (24 星ぶんの Dialog を積まない)。スマホは 1 タップで寄せながら開く — 詳細に名前が
 * 出るので、デスクトップの「まず寄る」1 手目が要らない。
 *
 * ## ホームの盤面 (ガイドとつながる)
 *
 * この盤面は受講者のホームそのもの (`LearnerHome`)。横のガイドが「次にやること」を
 * 言い、盤面は「それがどこか」を見せる。開いた直後は **現在地の星へ寄せ**
 * (`initialFocusStageId`)、ガイドが勧めている星には「おすすめ」の輪を付ける
 * (`highlightStageIds`)。ガイドの「ツリーで見る」は `handleRef.focusStage` で星へ寄る。
 * いま取り組む星 (現在地、無ければ先頭のおすすめ) には、押さなくても読める詳細の札を
 * 星の下に常に出す (`spotlight`)。ほかのおすすめの星は名前だけを常に出す。
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

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
import {
  layoutRadialSkillTree,
  type RadialBounds,
  type RadialIsland,
  type RadialNode,
} from "./radial-layout";
import { sectorLabelsInView } from "./sector-label";
import { SkillTreeCanvas, type SkillTreeCanvasHandle } from "./SkillTreeCanvas";
import { describeStar, hasStarActions, labelOf, type StarDetail } from "./star-detail";

/**
 * いま取り組む星に常に出す詳細の札 (押さなくても読める)。中身は呼び出し側が決める —
 * 盤面は受講中のレッスンを知らないので、「次のレッスン」や進捗はホームが渡す。
 */
export interface TreeSpotlight {
  stageId: string;
  /** 見出しの上の札 (「いま進めている」「おすすめ」など)。 */
  eyebrow: string;
  /** 本文 (次のレッスン / 到達説明)。 */
  detail?: string;
  /** 進捗 (0-100)。進行中の星だけ。 */
  progress?: number;
  /** 主ボタン (強調)。`icon` は始める・続ける (play) か、一覧を開く (book) か。 */
  action?: { label: string; icon: "play" | "book"; onClick: () => void; disabled?: boolean };
  /** 控えのボタン。 */
  secondary?: { label: string; onClick: () => void };
}

/** 親 (ホームのガイド) から盤面を操作するためのハンドル。 */
export interface SkillTreeHandle {
  /** その星へ寄せて名前を出す。盤面に描いていない星なら false。 */
  focusStage: (stageId: string) => boolean;
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
  /**
   * 開いた直後に寄せる星 (現在地)。null なら入口の星座を見せる。
   * 最初に描けたときに 1 回だけ寄る — 再取得のたびに視点を奪わない。
   */
  initialFocusStageId?: string | null;
  /** ガイドが勧めている星。「おすすめ」の輪を付け、名前を常に出す。 */
  highlightStageIds?: string[];
  /** いま取り組む星の詳細の札。null なら出さない。 */
  spotlight?: TreeSpotlight | null;
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
   * 島タイトルの 2 行目に ` · ` で足す文言。null か空なら「n ステージ」だけ。
   */
  islandCaption?: (key: string) => string | null;
  /** 本土の見出し。既定は「開発スキル」。 */
  mainlandTitle?: string;
  /** 右上の島チップを出す。既定は出す。false のときはルート名が避ける障害物からも外す。 */
  showIslandChips?: boolean;
  /**
   * 最初に描けたとき 1 回だけ全体表示にする。
   * true のときは `initialFocusStageId` へ寄せない。
   */
  initialFit?: boolean;
  className?: string;
}

/**
 * ルート (本土のカテゴリ) と島ごとのメイン色 — roadmap.sh を参考にした構成の色分け。
 *
 * 扇 / 島のキーは原則カテゴリ (霧の星にも入る)。カテゴリを持たない星はテーマ名に
 * 落ちるので、両方を載せる (`packages/content` の stage.json の category /
 * theme と対で保つ)。値は `rgb(r g b / a)` に埋め込む RGB 三つ組。ここに無い扇
 * (基礎) は従来の星色のまま — ルートや島が増えたらここに 1 行足す。
 */
const ROUTE_ACCENTS = new Map<string, string>([
  ["フロントエンド", "56 189 248"], // sky-400
  ["Web の見た目と動き", "56 189 248"],
  ["バックエンド", "52 211 153"], // emerald-400
  ["サーバーとデータの基盤", "52 211 153"],
  ["フルスタック", "251 113 133"], // rose-400
  ["Web アプリを作り、届ける力", "251 113 133"],
  // 島 (本土から離れた星団)。キーは島のカテゴリ = 島タイトル。
  ["AWS資格", "251 191 36"], // amber-400
  ["資格で示すクラウド力", "251 191 36"],
  ["情報処理資格", "167 139 250"], // violet-400
  ["資格で示す基礎力", "167 139 250"],
  ["Anthropic認定資格", "232 121 249"], // fuchsia-400
  ["資格で示すAI開発力", "232 121 249"],
  ["DevOps", "251 146 60"], // orange-400
  ["開発と運用をつなぐ", "251 146 60"],
  ["Python", "45 212 191"], // teal-400
  ["Python とテストの力", "45 212 191"],
  ["C#", "129 140 248"], // indigo-400
  ["Salesforce案件", "163 230 53"], // lime-400
  ["業務システムの開発", "163 230 53"],
  ["開発ラボG", "203 213 225"], // slate-300
  ["開発ラボG の選考", "203 213 225"],
]);

/** 島の枠とタイトルで、ルート色が無いときに使う色 (slate-300)。 */
const ISLAND_NEUTRAL = "203 213 225";

function islandAccentOf(key: string): string {
  return ROUTE_ACCENTS.get(key) ?? ISLAND_NEUTRAL;
}

function routeAccentOf(sector: string): string | undefined {
  return ROUTE_ACCENTS.get(sector);
}

/** ルート色を持つ扇の星に渡す CSS 変数 (index.css の tree-star-* が拾う)。 */
function routeStyleOf(accent: string | undefined): CSSProperties {
  if (!accent) return {};
  return {
    "--route-border": `rgb(${accent} / 0.7)`,
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

function PlaceHeading({
  title,
  detail,
  left,
  top,
  scale,
  titleClassName,
  titleColor,
}: {
  title: string;
  detail: string;
  left: number;
  top: number;
  scale: number;
  titleClassName?: string;
  titleColor?: string;
}) {
  return (
    <div
      className="pointer-events-none absolute text-center"
      style={{
        left,
        top,
        transform: `translate(-50%, -100%) scale(${placeScaleOf(scale)})`,
        transformOrigin: "50% 100%",
      }}
    >
      <div
        className={cn("whitespace-nowrap text-[11px] font-bold tracking-wide", titleClassName)}
        style={titleColor ? { color: titleColor } : undefined}
      >
        {title}
      </div>
      <div className="tree-place-caption whitespace-nowrap text-[9px] font-medium leading-tight">
        {detail}
      </div>
    </div>
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
/** この倍率以上で、フォーカス中の星の名前を出す。 */
const LABEL_FOCUS_SCALE = 0.7;
/** この倍率以上で、すべての星の名前を出す。 */
const LABEL_ALL_SCALE = 1.2;
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
  initialFocusStageId = null,
  highlightStageIds = [],
  spotlight = null,
  handleRef,
  insetLeft = 0,
  renderDetail,
  loadIcons = getSkillMapIcons,
  starTag,
  celebrate = true,
  islandCaption,
  mainlandTitle = "開発スキル",
  showIslandChips = true,
  initialFit = false,
  className,
}: SkillTreeProps) => {
  // 座標は星の集合が変わったときだけ計算し直す (ポップオーバーの開閉で組み直さない)。
  const layout = useMemo(() => layoutRadialSkillTree(nodes), [nodes]);
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
  /** 見え方 (画面端の矢印の計算用)。初回レンダー前は null。 */
  const [view, setView] = useState<ViewState | null>(null);
  /** クリックで寄せた星。全体表示へ戻すと消える。 */
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const handleScaleChange = useCallback((next: number) => {
    setScale(next);
    if (next < LABEL_FOCUS_SCALE) setFocusedId(null);
  }, []);
  const activateStar = useCallback(
    (placed: RadialNode): boolean => {
      const shouldZoom = scale < FOCUS_SCALE - 0.02;
      canvasRef.current?.focusOn(placed.x, placed.y, FOCUS_SCALE);
      setFocusedId(placed.instanceId);
      // 全体表示からの 1 手目は寄るだけ。詳細は寄ったあとのクリックで開く。
      return !shouldZoom;
    },
    [scale],
  );
  /**
   * スマホ: タップ 1 回で寄せながらシートを開く。
   *
   * デスクトップの「まず寄る」1 手目は、寄らないと星の名前が読めないための段。
   * シートには名前も状態も出るので、スマホでは 1 手目から開いてよい (寄せるのは
   * どの星を見ているかを盤面側でも示すため — シートは下端に出るので隠れない)。
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
   * (`sectorLabelsInView`)。島の星は島タイトルが担うので本土の扇だけ渡す。
   * 出している島チップとズームボタンは障害物として避け、オーバーレイに載せるので倍率で縮小しない。
   * 星の名前 (`showsAllLabels`) より低い倍率から出す。
   */
  const sectorLabels = useMemo(() => {
    if (!visibleView || visibleView.scale < SECTOR_LABEL_MIN_SCALE) return [];
    const mainland = new Set(layout.sectors.map((s) => s.key));
    const stars = layout.nodes
      .filter((n) => mainland.has(n.sector) && drawsStar(n))
      .map((n) => ({
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
    return sectorLabelsInView(stars, visibleView, obstacles).map((label) => ({
      ...label,
      left: label.left + viewInset,
    }));
  }, [layout, visibleView, viewInset, drawsStar, visibleIslands, showIslandChips]);
  const jumpTo = useCallback((x: number, y: number) => {
    canvasRef.current?.focusOn(x, y, 1);
    setFocusedId(null);
  }, []);
  /** 詳細の札を付ける星 (複製された星は最初に描いた器)。描いていない星なら出さない。 */
  const spotlightStageId = spotlight?.stageId ?? null;
  const spotlightPlaced = useMemo(
    () =>
      spotlightStageId
        ? (layout.nodes.find((n) => n.node.id === spotlightStageId && drawsStar(n)) ?? null)
        : null,
    [layout, spotlightStageId, drawsStar],
  );
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
  useEffect(() => {
    if (!handleRef) return;
    handleRef.current = { focusStage: (stageId) => focusStage(stageId) };
    return () => {
      handleRef.current = null;
    };
  }, [handleRef, focusStage]);

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
      <nav className="flex flex-wrap justify-end gap-1" aria-label="島へ移動">
        {jumpTargets.map((target) => {
          const accent = routeAccentOf(target.key);
          return (
            <Button
              key={target.key}
              size="sm"
              variant="outline"
              className="tree-zoom-btn h-6 gap-1.5 px-2 text-[10.5px]"
              onClick={() => jumpTo(target.x, target.y)}
            >
              <span
                aria-hidden="true"
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: accent ? `rgb(${accent})` : "rgb(230 232 245 / 0.7)" }}
              />
              {target.key}
            </Button>
          );
        })}
      </nav>
    ) : null;

  return (
    <SkillTreeCanvas
      worldWidth={layout.width}
      worldHeight={layout.height}
      contentBounds={contentBounds}
      handleRef={canvasRef}
      onScaleChange={handleScaleChange}
      onViewChange={setView}
      insetLeft={insetLeft}
      className={className}
      overlay={
        <>
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
            className="pointer-events-none absolute"
            style={{
              left: frame.minX,
              top: frame.minY,
              width,
              height,
              boxSizing: "border-box",
              borderRadius: Math.min(width, height) / 2,
              background: `rgb(${accent} / 0.07)`,
              border: `1px dashed rgb(${accent} / 0.32)`,
            }}
          />
        );
      })}
      <svg
        className="absolute inset-0"
        width={layout.width}
        height={layout.height}
        aria-hidden="true"
      >
        <title>前提のつながり</title>
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
      </svg>

      {/* 島タイトル。ズーム段に関わらず常時出す — 全体表示でも離れ小島が
          読めるように、逆スケールで画面上の大きさを保つ。置き場所は枠の上辺。 */}
      {islandFrames.map(({ island, frame, count }) => (
        <PlaceHeading
          key={`island-title-${island.key}`}
          title={island.key}
          detail={stageCountLine(count, islandCaption?.(island.key))}
          left={(frame.minX + frame.maxX) / 2}
          top={frame.minY}
          scale={scale}
          titleClassName="tree-sector-label"
          titleColor={`rgb(${islandAccentOf(island.key)} / 0.9)`}
        />
      ))}
      {layout.mainlandBounds && drawnCounts.mainland > 0 ? (
        <PlaceHeading
          title={mainlandTitle}
          detail={stageCountLine(drawnCounts.mainland, null)}
          left={(layout.mainlandBounds.minX + layout.mainlandBounds.maxX) / 2}
          top={layout.mainlandBounds.minY - 48}
          scale={scale}
          titleClassName="tree-mainland-label"
        />
      ) : null}

      {layout.nodes.filter(drawsStar).map((placed) => (
        <StarNode
          key={placed.instanceId}
          placed={placed}
          isActive={placed.node.id === activeStageId}
          queued={queuedStageIds.includes(placed.node.id)}
          highlighted={highlightStageIds.includes(placed.node.id)}
          showLabel={
            // 札を付けた星は札が名前を持つ。おすすめの星は寄らなくても名前を出す。
            placed.instanceId !== spotlightPlaced?.instanceId &&
            (showsAllLabels(scale) ||
              highlightStageIds.includes(placed.node.id) ||
              (placed.instanceId === focusedId && showsFocusLabel(scale)))
          }
          coreScale={starGrowOf(placed.ring === 0, scale)}
          celebration={celebrations.get(placed.node.id)}
          celebrationIndex={celebrationOrder.get(placed.node.id) ?? 0}
          iconUrl={
            placed.node.state !== "locked" && placed.node.has_icon
              ? (iconUrls.get(placed.node.id) ?? null)
              : null
          }
          onActivate={() => activateStar(placed)}
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

      {spotlight && spotlightPlaced ? (
        <StarSpotlight placed={spotlightPlaced} spotlight={spotlight} scale={scale} />
      ) : null}
    </SkillTreeCanvas>
  );
};

/**
 * いま取り組む星の詳細の札。星の真下に常に出る (ポップオーバーのように押して開く器ではない)。
 *
 * 盤面と一緒に動くよう transform の中に置き、島タイトルと同じく倍率の逆数で縮めて
 * 画面上の大きさを保つ (全体表示でも読める)。ボタンは `button` なので、押しても
 * 盤面のドラッグは始まらない。
 */
const StarSpotlight = ({
  placed,
  spotlight,
  scale,
}: {
  placed: RadialNode;
  spotlight: TreeSpotlight;
  scale: number;
}) => {
  const radius = placed.ring === 0 ? 22 : 16;
  const title = labelOf(placed.node);
  // フォーカス追従 (SkillTreeCanvas の onFocusCapture) 用の盤面座標。
  const treeAt = { "data-tree-x": placed.x, "data-tree-y": placed.y };
  return (
    <section
      aria-label={`${spotlight.eyebrow}: ${title}`}
      className="tree-callout absolute z-20 w-[236px] rounded-xl border p-3 shadow-lg"
      style={{
        left: placed.x,
        // おすすめの輪 (外へ 6px) の下から。
        top: placed.y + radius + 10,
        transform: `translate(-50%, 0) scale(${Math.min(8, 1 / Math.max(0.05, scale))})`,
        transformOrigin: "50% 0",
      }}
    >
      <div className="text-[10.5px] font-semibold tracking-wide text-brand-ink">
        {spotlight.eyebrow}
      </div>
      <div className="mt-0.5 text-[13px] font-semibold leading-snug">{title}</div>
      {spotlight.progress != null ? (
        <div className="mt-2 flex items-center gap-2">
          <Progress value={spotlight.progress} tone="brand" className="flex-1" />
          <span className="text-[10.5px] tabular-nums text-ink-3">{spotlight.progress}%</span>
        </div>
      ) : null}
      {spotlight.detail ? (
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-2">{spotlight.detail}</p>
      ) : null}
      {spotlight.action || spotlight.secondary ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {spotlight.action ? (
            <Button
              size="sm"
              variant="accent"
              disabled={spotlight.action.disabled}
              onClick={spotlight.action.onClick}
              {...treeAt}
            >
              {spotlight.action.icon === "book" ? <Book size={12} /> : <Play size={12} />}
              {spotlight.action.label}
            </Button>
          ) : null}
          {spotlight.secondary ? (
            <Button size="sm" variant="ghost" onClick={spotlight.secondary.onClick} {...treeAt}>
              <Book size={12} />
              {spotlight.secondary.label}
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
};

interface StarNodeProps {
  placed: RadialNode;
  isActive: boolean;
  queued: boolean;
  /** ガイドが勧めている星 (「おすすめ」の輪)。 */
  highlighted: boolean;
  /** 名前を星の下に出すか。全体表示では出さない。 */
  showLabel: boolean;
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
   * ロックと霧は親が渡さない (ロックは南京錠のまま、霧はサーバが has_icon を伏せる)。
   */
  iconUrl: string | null;
  /**
   * クリック 1 手目 (sm 以上)。false なら寄るだけでポップオーバーは開かない
   * (全体表示からのズームイン)。
   */
  onActivate: () => boolean;
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
  queued,
  highlighted,
  showLabel,
  coreScale,
  celebration,
  celebrationIndex,
  iconUrl,
  onActivate,
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
  const [open, setOpen] = useState(false);
  const node = placed.node;
  const detail = describeStar({ node, isActive, queued, revealDev });
  const fog = node.visibility === "fog";
  const cleared = node.state === "cleared";
  const locked = node.state === "locked";
  const isCenter = placed.ring === 0;
  const routeStyle = routeStyleOf(routeAccentOf(placed.sector));
  // ステージアイコン (単色シルエット)。見える星 (解放済み・進行中・クリア) だけ状態グリフを
  // 置き換える — ロックは 🔒 のまま (状態が読めなくなる)、霧はサーバが has_icon を
  // 伏せているので親が URL を渡さない。色は mask + currentColor で状態クラスから継承する。
  // 画像が届くまで (届かなければずっと) 状態グリフのまま。

  const act = (run: () => void) => {
    setOpen(false);
    run();
  };

  /*
   * 器が入れ替わったら、開いたままのポップオーバーの状態を捨てる。
   *
   * 下の早期 return は Popover を描かなくするだけで `open` は残るので、幅が戻った
   * とき (端末の回転で 640px を跨ぐ) に前の星の詳細が甦ってしまう。シートで別の星を
   * 見たあとでも、甦るのは回転前に開いていた星のほう。
   */
  useEffect(() => {
    if (sheetMode) setOpen(false);
  }, [sheetMode]);

  // 見た目をぼかしている星は読み上げにも実名を流さない (Issue #272)。ぼかしが演出で
  // あっても、画面で読めない名前がスクリーンリーダーにだけ届くのは情報設計として
  // ちぐはぐで、「まだ見えない」という状態そのものが伝わらない。
  const spokenLabel = detail.obscured ? "まだ見えないスキル" : detail.label;

  const star = (
    <button
      type="button"
      aria-label={`${spokenLabel}（${detail.stateText}${tag ? `・${tag}` : ""}${highlighted ? "・おすすめ" : ""}${celebration === "unlocked" ? "・新しく解放" : celebration === "appeared" ? "・新しく登場" : ""}）`}
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
        {/* ガイドが勧めている星。状態の色を変えず、外側の輪だけで「ここ」と示す。 */}
        {highlighted ? <span className="tree-next-ring" /> : null}
        <span
          className={cn(
            "tree-star grid place-items-center rounded-full border transition-colors",
            isCenter ? "h-11 w-11" : "h-8 w-8",
            cleared
              ? "tree-star-cleared"
              : isActive
                ? "tree-star-active"
                : node.state === "unlocked"
                  ? "tree-star-open"
                  : "tree-star-locked",
            // 現在地だけ脈動させる。reduced-motion では止める。
            isActive ? "animate-pulse motion-reduce:animate-none" : "",
            fog && detail.obscured ? "opacity-45" : fog ? "opacity-70" : "",
            celebration === "unlocked" ? "tree-unlock-pop" : "",
          )}
          style={coreScale > 1 ? { transform: `scale(${coreScale})` } : undefined}
        >
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
        </span>
        {showLabel ? (
          tag ? (
            <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-0.5 flex w-max max-w-[7rem] -translate-x-1/2 flex-col items-center">
              <span
                className={cn(
                  "line-clamp-2 text-center text-[8px] leading-tight",
                  isActive ? "tree-star-label-active font-semibold" : "tree-star-label",
                  detail.obscured ? "tree-star-label-fog blur-[1.5px] select-none" : "",
                )}
              >
                {detail.label}
              </span>
              <span className="mt-0.5 rounded-full bg-card/95 px-1 py-px text-[7px] font-semibold leading-none text-ink-2 ring-1 ring-border">
                {tag}
              </span>
            </span>
          ) : (
            <span
              className={cn(
                "pointer-events-none absolute left-1/2 top-full z-10 mt-0.5 w-[4.5rem] -translate-x-1/2 line-clamp-2 text-center text-[8px] leading-tight",
                isActive ? "tree-star-label-active font-semibold" : "tree-star-label",
                // 霧の星は名前をぼかして「予告」だけ見せる。開発者モードではぼかさない。
                detail.obscured ? "tree-star-label-fog blur-[1.5px] select-none" : "",
              )}
            >
              {detail.label}
            </span>
          )
        ) : null}
        {celebration ? (
          <span className="tree-new-badge" aria-hidden="true">
            {celebration === "unlocked" ? "解放!" : "NEW"}
          </span>
        ) : highlighted ? (
          <span className="tree-new-badge tree-next-badge" aria-hidden="true">
            おすすめ
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
      open={open}
      onOpenChange={(next) => {
        if (next && !onActivate()) return;
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>{star}</PopoverTrigger>

      <PopoverContent
        align="center"
        side="right"
        className={renderDetail ? "max-h-[min(70vh,32rem)] w-[300px] overflow-y-auto" : "w-[280px]"}
      >
        <div className="text-[13px] font-semibold leading-snug">
          {detail.obscured ? (
            <>
              {/* 名前はぼかしの予告だけ。読み上げには「まだ見えない」ことだけを流す。 */}
              <span aria-hidden="true" className="blur-[3px] select-none">
                {detail.label}
              </span>
              <span className="sr-only">まだ見えないスキル</span>
            </>
          ) : (
            detail.label
          )}
        </div>
        {renderDetail ? (
          <div className="mt-2">{renderDetail(node, () => setOpen(false))}</div>
        ) : (
          <>
            <div className="mt-0.5 text-[11px] text-ink-3">{detail.stateText}</div>

            <StarBody detail={detail} size="sm" className="mt-2" />

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
  const detail = describeStar({
    node,
    isActive: node.id === activeStageId,
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
                  <span className="sr-only">まだ見えないスキル</span>
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
            <StarBody detail={detail} size="md" className="overflow-y-auto px-4 py-3" />

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
                />
              </DrawerFooter>
            ) : null}
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
};

/** 詳細の本文 (予告 / 解放条件 / 到達説明)。器を跨いで同じ文面を出す。 */
const StarBody = ({
  detail,
  size,
  className,
}: {
  detail: StarDetail;
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
    return (
      <div className={cn(text, "text-ink-3", className)}>
        <div className="font-semibold text-ink-2">解放条件</div>
        <div className="mt-0.5">{body.text}</div>
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
}

/**
 * 詳細のボタン列。並びは器を跨いで同じで、器が外側の箱だけを決める。
 *
 * 先頭がその星の主な一手 (続きから / ここから始める / 飛び級) で、強調はそこだけ。
 */
const StarActions = ({
  detail,
  stageId,
  size,
  onAct,
  onResumeStage,
  onStartStage,
  onQueueStage,
  onSkillCheck,
  onOpenStage,
}: StarActionsProps) => {
  const { skillCheck, resume, start, queue, openStage, clearedNote } = detail.actions;
  return (
    <>
      {resume ? (
        <Button size={size} variant="accent" onClick={() => onAct(() => onResumeStage(stageId))}>
          <Play size={12} />
          続きから
        </Button>
      ) : null}

      {start ? (
        <Button size={size} variant="accent" onClick={() => onAct(() => onStartStage(stageId))}>
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
        <Button size={size} variant="outline" onClick={() => onAct(() => onOpenStage(stageId))}>
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
