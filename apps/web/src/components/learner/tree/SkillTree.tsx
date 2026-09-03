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
 * `full` 以外をサーバが断る。段の仕様は
 * `docs/superpowers/specs/2026-08-30-skill-tree-fog-display-design.md`。
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
 * 島の名前は星団の上のタイトルとジャンプチップ・端の矢印で示す (円の背景は描かない)。
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
 * ## 解放の演出は差分で 1 回だけ
 *
 * 「前回見たときは閉じていた星が開いた」「無かった星が現れた (教材の公開)」を
 * `celebration.ts` が localStorage の前回スナップショットとの差分で検出し、その星に
 * 1 回だけアニメーションを付ける (`index.css` の `tree-*`)。reduced-motion では
 * すべて止まる。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useIsMobileViewport } from "@/hooks/useIsMobileViewport";
import { isApiConfigured } from "@/lib/api-client";
import { ArrowUp, Check, Lock, Play, Plus, Sparkles, Star, X } from "@/lib/icons";
import { getSkillMapIcons, type SkillMapStageNode } from "@/lib/skill-map-api";
import { cn } from "@/lib/utils";

import { useSkillTreeCelebration, type CelebrationKind } from "./celebration";
import { showsStar } from "./fog-display";
import { iconFetchKey } from "./icon-fetch-key";
import { offscreenMarkers, type ViewState } from "./offscreen";
import { layoutRadialSkillTree, type RadialNode } from "./radial-layout";
import { sectorLabelsInView } from "./sector-label";
import { SkillTreeCanvas, type SkillTreeCanvasHandle } from "./SkillTreeCanvas";
import { describeStar, hasStarActions, type StarDetail } from "./star-detail";

interface SkillTreeProps {
  nodes: SkillMapStageNode[];
  /** 演出のスナップショットを本人ごとに分けるためのキー。 */
  currentUserId: string | null;
  activeStageId: string | null;
  /** 既に「次にやるリスト」に積んである星。 */
  queuedStageIds: string[];
  /** 「ここから始める」(いま進める星に切り替える)。 */
  onStartStage: (stageId: string) => void;
  /** 「キューに追加」。 */
  onQueueStage: (stageId: string) => void;
  /** 腕試しを開く。 */
  onSkillCheck: (stageId: string) => void;
  /** 開発者モード: 段を素通しし、幽霊ノードも星として描く。 */
  revealDev?: boolean;
  /**
   * 盤面の左上に浮かべる HUD (見出し・修了数・レベル)。島チップはこの下に並ぶ。
   * 盤面の外に置くと全面表示のときに Card 分の帯が要るので、盤面の中に載せる。
   */
  hud?: ReactNode;
  className?: string;
}

/**
 * ルート (本土のカテゴリ) と島ごとのメイン色 — roadmap.sh を参考にした構成の色分け。
 *
 * 扇 / 島のキーは原則カテゴリ (霧の星にも入る)。カテゴリを持たない星はテーマ名に
 * 落ちるので、両方を載せる (`packages/content` の course.json の category /
 * theme と対で保つ)。値は `rgb(r g b / a)` に埋め込む RGB 三つ組。ここに無い扇
 * (基礎) は従来の星色のまま — ルートや島が増えたらここに 1 行足す。
 */
const ROUTE_ACCENTS = new Map<string, string>([
  ["フロントエンド", "56 189 248"], // sky-400
  ["Web の見た目と動き", "56 189 248"],
  ["バックエンド", "52 211 153"], // emerald-400
  ["サーバーとデータの基盤", "52 211 153"],
  // 島 (本土から離れた星団)。キーは島のカテゴリ = 島タイトル。
  ["AWS資格", "251 191 36"], // amber-400
  ["資格で示すクラウド力", "251 191 36"],
  ["情報処理資格", "167 139 250"], // violet-400
  ["資格で示す基礎力", "167 139 250"],
  ["AI駆動開発", "232 121 249"], // fuchsia-400
  ["AI と働く力", "232 121 249"],
  ["DevOps", "251 146 60"], // orange-400
  ["開発と運用をつなぐ", "251 146 60"],
]);

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

/**
 * 講座アイコンを JWT 付きで 1 回取り、mask-image 用の blob URL にする。
 *
 * 公開 R2 URL を mask に直接渡すと CORS でマスクが透明になり、星の中身が空白になる。
 * 星ごとに取るとマップ評価 (D1) が N 回走るので、ツリー全体で 1 リクエストにする。
 * 届かない間・失敗したときは呼び出し側が状態グリフに落とす。
 *
 * 依存は `iconFetchKey` — 見える has_icon の集合か受講者が変わったら取り直す。
 * 空配列だと、腕試しで霧が開けても初回のバッチのままになる。
 */
function useStageIconUrls(fetchKey: string): Map<string, string> {
  const [urls, setUrls] = useState<Map<string, string>>(() => new Map());
  // biome-ignore lint/correctness/useExhaustiveDependencies: fetchKey は再取得トリガー (URL は固定)
  useEffect(() => {
    if (!isApiConfigured()) return;
    const ac = new AbortController();
    let created: string[] = [];
    void getSkillMapIcons(ac.signal)
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
  }, [fetchKey]);
  return urls;
}

/** クリックで寄せる倍率。全体表示からここに来ると名前が出る。 */
const FOCUS_SCALE = 1.25;
/** この倍率以上で、フォーカス中の星の名前を出す。 */
const LABEL_FOCUS_SCALE = 0.7;
/** この倍率以上で、すべての星の名前と扇見出しを出す。 */
const LABEL_ALL_SCALE = 1.2;

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
  onStartStage,
  onQueueStage,
  onSkillCheck,
  revealDev = false,
  hud,
  className,
}: SkillTreeProps) => {
  // 座標は星の集合が変わったときだけ計算し直す (ポップオーバーの開閉で組み直さない)。
  const layout = useMemo(() => layoutRadialSkillTree(nodes), [nodes]);
  const iconUrls = useStageIconUrls(iconFetchKey(currentUserId, nodes));
  const celebrations = useSkillTreeCelebration(currentUserId, nodes);
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
      radii.set(placed.instanceId, !drawsStar(placed) ? 0 : placed.ring === 0 ? 22 : 16);
    }
    return radii;
  }, [layout, drawsStar]);
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
   * 表示名は「本土」ではなく「開発スキル」— 隣に並ぶ島の名前 (AWS資格 / AI駆動開発 / DevOps)
   * が内容の名前なので、場所の名前を混ぜると凡例として読めない。
   *
   * 矢印は名前が全部出る倍率 (`showsAllLabels`) では消す — 寄って読んでいるときに
   * 縁の矢印と名前札が重なり、盤面の外の案内より目の前の星が優先だから。
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
  const jumpTargets = useMemo(
    () => [
      { key: "開発スキル", x: layout.centerX, y: layout.centerY },
      ...visibleIslands.map((island) => ({ key: island.key, x: island.cx, y: island.cy })),
    ],
    [layout, visibleIslands],
  );
  const markers = useMemo(
    () => (view && !showsAllLabels(view.scale) ? offscreenMarkers(jumpTargets, view) : []),
    [jumpTargets, view],
  );
  /**
   * ルート名は盤面外周の固定点ではなく、いま見えている星のそばへ出す
   * (`sectorLabelsInView`)。島の星は島タイトルが担うので本土の扇だけ渡す。
   * HUD / ズームボタンは障害物として避け、オーバーレイに載せるので倍率で縮小しない。
   */
  const sectorLabels = useMemo(() => {
    if (!view || !showsAllLabels(view.scale)) return [];
    const mainland = new Set(layout.sectors.map((s) => s.key));
    const stars = layout.nodes
      .filter((n) => mainland.has(n.sector) && drawsStar(n))
      .map((n) => ({
        sector: n.sector,
        x: n.x,
        y: n.y,
        radius: n.ring === 0 ? 22 : 16,
      }));
    const hudH = visibleIslands.length > 0 ? 100 : 56;
    return sectorLabelsInView(stars, view, [
      { left: 8, top: 8, width: Math.min(420, Math.max(0, view.width - 72)), height: hudH },
      { left: Math.max(0, view.width - 52), top: 8, width: 44, height: 120 },
    ]);
  }, [layout, view, drawsStar, visibleIslands]);
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

  if (nodes.length === 0) {
    return (
      <div className={cn("px-4 py-10 text-center text-[12.5px] text-ink-3", className)}>
        まだスキルがありません。教材が公開されると、ここに現れます。
      </div>
    );
  }

  const chips =
    visibleIslands.length > 0 ? (
      <nav className="flex flex-wrap gap-1" aria-label="島へ移動">
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
      contentBounds={layout.bounds}
      handleRef={canvasRef}
      onScaleChange={handleScaleChange}
      onViewChange={setView}
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
          {/* 左上: HUD + 島チップ。右上のズームボタン (Canvas 側) と被らない幅に収める。 */}
          {hud || chips ? (
            <div className="absolute left-3 top-3 flex max-w-[calc(100%-4rem)] flex-col items-start gap-2">
              {hud}
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
              onStartStage={onStartStage}
              onQueueStage={onQueueStage}
              onSkillCheck={onSkillCheck}
            />
          ) : null}
        </>
      }
    >
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

      {/* 島タイトル。ズーム段に関わらず常時出す — 全体表示 (アイコンだけ) のとき、
          離れ小島がレイアウトの事故に見えないための唯一の道しるべ。盤面の縮尺に
          釣られると全体表示で読めなくなるので、逆スケールで画面上の大きさを保つ
          (地図アプリの地名ラベルと同じ扱い)。 */}
      {visibleIslands.map((island) => {
        const accent = routeAccentOf(island.key);
        return (
          <div
            key={island.key}
            className="tree-sector-label absolute whitespace-nowrap text-[11px] font-bold tracking-wide"
            style={{
              left: island.labelX,
              top: island.labelY,
              transform: `translate(-50%, -100%) scale(${Math.min(8, 1 / Math.max(0.05, scale))})`,
              transformOrigin: "50% 100%",
              ...(accent ? { color: `rgb(${accent} / 0.9)` } : {}),
            }}
          >
            {island.key}
          </div>
        );
      })}

      {layout.nodes.filter(drawsStar).map((placed) => (
        <StarNode
          key={placed.instanceId}
          placed={placed}
          isActive={placed.node.id === activeStageId}
          queued={queuedStageIds.includes(placed.node.id)}
          showLabel={
            showsAllLabels(scale) || (placed.instanceId === focusedId && showsFocusLabel(scale))
          }
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
          onStartStage={onStartStage}
          onQueueStage={onQueueStage}
          onSkillCheck={onSkillCheck}
          revealDev={revealDev}
        />
      ))}
    </SkillTreeCanvas>
  );
};

interface StarNodeProps {
  placed: RadialNode;
  isActive: boolean;
  queued: boolean;
  /** 名前を星の下に出すか。全体表示では出さない。 */
  showLabel: boolean;
  /** 差分で検出した演出 (「解放」/「出現」)。undefined なら演出なし。 */
  celebration: CelebrationKind | undefined;
  /** 複数の演出を内側から順に灯すための順番。 */
  celebrationIndex: number;
  /**
   * 講座アイコンの blob URL。無い / 届いていないときは状態グリフ。
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
  onStartStage: (stageId: string) => void;
  onQueueStage: (stageId: string) => void;
  onSkillCheck: (stageId: string) => void;
  revealDev: boolean;
}

const StarNode = ({
  placed,
  isActive,
  queued,
  showLabel,
  celebration,
  celebrationIndex,
  iconUrl,
  onActivate,
  sheetMode,
  sheetOpen,
  onOpenSheet,
  onStartStage,
  onQueueStage,
  onSkillCheck,
  revealDev,
}: StarNodeProps) => {
  const [open, setOpen] = useState(false);
  const node = placed.node;
  const detail = describeStar({ node, isActive, queued, revealDev });
  const fog = node.visibility === "fog";
  const cleared = node.state === "cleared";
  const locked = node.state === "locked";
  const isCenter = placed.ring === 0;
  const routeStyle = routeStyleOf(routeAccentOf(placed.sector));
  // 講座アイコン (単色シルエット)。見える星 (解放済み・進行中・クリア) だけ状態グリフを
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
      aria-label={`${spokenLabel}（${detail.stateText}${celebration === "unlocked" ? "・新しく解放" : celebration === "appeared" ? "・新しく登場" : ""}）`}
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
      open={open}
      onOpenChange={(next) => {
        if (next && !onActivate()) return;
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>{star}</PopoverTrigger>

      <PopoverContent align="center" side="right" className="w-[280px]">
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
        <div className="mt-0.5 text-[11px] text-ink-3">{detail.stateText}</div>

        <StarBody detail={detail} size="sm" className="mt-2" />

        {hasStarActions(detail.actions) ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <StarActions
              detail={detail}
              stageId={node.id}
              size="sm"
              onAct={act}
              onStartStage={onStartStage}
              onQueueStage={onQueueStage}
              onSkillCheck={onSkillCheck}
            />
          </div>
        ) : null}
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
  onStartStage: (stageId: string) => void;
  onQueueStage: (stageId: string) => void;
  onSkillCheck: (stageId: string) => void;
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
  onStartStage,
  onQueueStage,
  onSkillCheck,
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
            <DrawerDescription className="mt-0.5">{detail.stateText}</DrawerDescription>
          </div>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon-sm" aria-label="閉じる">
              <X size={14} />
            </Button>
          </DrawerClose>
        </DrawerHeader>

        <StarBody detail={detail} size="md" className="overflow-y-auto px-4 py-3" />

        {hasStarActions(detail.actions) ? (
          // 器の既定は下から積む (`flex-col-reverse`) が、ここは読む順 = 並ぶ順にする。
          <DrawerFooter className="flex-col">
            <StarActions
              detail={detail}
              stageId={node.id}
              size="full"
              onAct={act}
              onStartStage={onStartStage}
              onQueueStage={onQueueStage}
              onSkillCheck={handOffToSkillCheck}
            />
          </DrawerFooter>
        ) : null}
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
  onStartStage: (stageId: string) => void;
  onQueueStage: (stageId: string) => void;
  onSkillCheck: (stageId: string) => void;
}

/** 詳細のボタン列。並びは器を跨いで同じで、器が外側の箱だけを決める。 */
const StarActions = ({
  detail,
  stageId,
  size,
  onAct,
  onStartStage,
  onQueueStage,
  onSkillCheck,
}: StarActionsProps) => {
  const { skillCheck, start, queue, clearedNote } = detail.actions;
  return (
    <>
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

      {start ? (
        <Button size={size} onClick={() => onAct(() => onStartStage(stageId))}>
          ここから始める
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
