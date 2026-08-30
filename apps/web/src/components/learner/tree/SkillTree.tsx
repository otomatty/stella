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
 * 何をどこまで見せるかは `GET /api/skill-map/mine` が決めていて、霧の星の通常応答は
 * タイトルと前提線まで (slug・解放条件は載せない)。ここは受け取った `state` ×
 * `visibility` を見た目に写すだけ。開発者モード (`revealDev`) のときだけ名前のぼかし
 * を外す — 開始や腕試しは visibility=fog のままサーバが断る。
 *
 * ## 線は SVG・星は button
 *
 * 星は `<button>` にして、キーボードでも到達できるようにする (SVG の図形に
 * `tabindex` を付けるより素直で、Popover のアンカーにもそのまま使える)。前提の線
 * だけを背後の SVG に敷き、座標は `radial-layout.ts` の決定的な計算に任せる。
 * 島の名前は星団の上のタイトルとジャンプチップ・端の矢印で示す (円の背景は描かない)。
 *
 * ## 解放の演出は差分で 1 回だけ
 *
 * 「前回見たときは閉じていた星が開いた」「無かった星が現れた (教材の公開)」を
 * `celebration.ts` が localStorage の前回スナップショットとの差分で検出し、その星に
 * 1 回だけアニメーションを付ける (`index.css` の `tree-*`)。reduced-motion では
 * すべて止まる。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowUp, Check, Lock, Play, Plus, Sparkles, Star } from "@/lib/icons";
import { getMaterialUrl, isStorageConfigured } from "@/lib/storage";
import type { SkillMapStageNode } from "@/lib/skill-map-api";
import { cn } from "@/lib/utils";

import { useSkillTreeCelebration, type CelebrationKind } from "./celebration";
import { fogObscured } from "./fog-display";
import { offscreenMarkers, type ViewState } from "./offscreen";
import { layoutRadialSkillTree, type RadialNode } from "./radial-layout";
import { sectorLabelsInView } from "./sector-label";
import { SkillTreeCanvas, type SkillTreeCanvasHandle } from "./SkillTreeCanvas";

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
  /** 開発者モード: 霧の星の名前をぼかさない。 */
  revealDev?: boolean;
  /**
   * 盤面の左上に浮かべる HUD (見出し・修了数・レベル)。島チップはこの下に並ぶ。
   * 盤面の外に置くと全面表示のときに Card 分の帯が要るので、盤面の中に載せる。
   */
  hud?: ReactNode;
  className?: string;
}

/** タイトルは霧の中でも届く (ぼかして出す)。無ければテーマ名 → 伏せ字に落ちる。 */
function labelOf(node: SkillMapStageNode): string {
  return node.title ?? node.theme ?? "？？？";
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
 * 講座アイコンの画像が実際に届くまで待つ。
 *
 * mask-image は読み込み失敗を DOM イベントで教えてくれず、失敗した画像は透明として
 * 扱われて星の中身が**空白**になる (R2 に無い・ローカルの作業ツリーがまだデプロイされて
 * いない、など)。Image で先に到達を確かめ、届いた URL のときだけマスクに使う。
 * 届かない間・失敗したときは呼び出し側が状態グリフに落とす。
 */
function useLoadedImage(url: string | null): string | null {
  const [loaded, setLoaded] = useState<string | null>(null);
  useEffect(() => {
    if (!url) return;
    let alive = true;
    const probe = new Image();
    probe.onload = () => {
      if (alive) setLoaded(url);
    };
    probe.src = url;
    return () => {
      alive = false;
    };
  }, [url]);
  return loaded === url ? url : null;
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
  const celebrations = useSkillTreeCelebration(currentUserId, nodes);
  const canvasRef = useRef<SkillTreeCanvasHandle | null>(null);
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
  /** 演出の順番 (複数の星が同時に開いたとき、内側から順に灯す)。 */
  const celebrationOrder = useMemo(() => {
    const order = new Map<string, number>();
    for (const placed of layout.nodes) {
      if (celebrations.has(placed.node.id)) order.set(placed.node.id, order.size);
    }
    return order;
  }, [layout, celebrations]);
  const starRadius = useMemo(() => {
    const radii = new Map<string, number>();
    for (const placed of layout.nodes) {
      radii.set(placed.instanceId, placed.ring === 0 ? 22 : 16);
    }
    return radii;
  }, [layout]);
  /**
   * ジャンプ先 (開発スキル = 中心のツリー + 島)。島は中心 1× の初期視点では視界の外
   * (中心から 1,000px 超) にあり、パンしなければ存在に気づけない。盤面の上のチップで
   * 直接飛べるようにし、視界の外にある間は画面端に方向の矢印も出す (`offscreenMarkers`)。
   *
   * 表示名は「本土」ではなく「開発スキル」— 隣に並ぶ島の名前 (AWS資格 / AI駆動開発)
   * が内容の名前なので、場所の名前を混ぜると凡例として読めない。
   *
   * 矢印は名前が全部出る倍率 (`showsAllLabels`) では消す — 寄って読んでいるときに
   * 縁の矢印と名前札が重なり、盤面の外の案内より目の前の星が優先だから。
   */
  const jumpTargets = useMemo(
    () => [
      { key: "開発スキル", x: layout.centerX, y: layout.centerY },
      ...layout.islands.map((island) => ({ key: island.key, x: island.cx, y: island.cy })),
    ],
    [layout],
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
      .filter((n) => mainland.has(n.sector))
      .map((n) => ({
        sector: n.sector,
        x: n.x,
        y: n.y,
        radius: n.ring === 0 ? 22 : 16,
      }));
    const hudH = layout.islands.length > 0 ? 100 : 56;
    return sectorLabelsInView(stars, view, [
      { left: 8, top: 8, width: Math.min(420, Math.max(0, view.width - 72)), height: hudH },
      { left: Math.max(0, view.width - 52), top: 8, width: 44, height: 120 },
    ]);
  }, [layout, view]);
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
    layout.islands.length > 0 ? (
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
          return (
            <line
              key={`${edge.fromId}-${edge.toId}`}
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
      {layout.islands.map((island) => {
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

      {layout.nodes.map((placed) => (
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
          onActivate={() => activateStar(placed)}
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
   * クリック 1 手目。false なら寄るだけでポップオーバーは開かない
   * (全体表示からのズームイン)。
   */
  onActivate: () => boolean;
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
  onActivate,
  onStartStage,
  onQueueStage,
  onSkillCheck,
  revealDev,
}: StarNodeProps) => {
  const [open, setOpen] = useState(false);
  const node = placed.node;
  const fog = node.visibility === "fog";
  const obscured = fogObscured(node.visibility, revealDev);
  const cleared = node.state === "cleared";
  const locked = node.state === "locked";
  const label = labelOf(node);
  const isCenter = placed.ring === 0;
  const routeStyle = routeStyleOf(routeAccentOf(placed.sector));
  // 講座アイコン (単色シルエット)。見える星 (解放済み・進行中・クリア) だけ状態グリフを
  // 置き換える — ロックは 🔒 のまま (状態が読めなくなる)、霧はサーバが icon_path を
  // 伏せているのでそもそも届かない。色は mask + currentColor で状態クラスから継承する。
  // 画像が届くまで (届かなければずっと) 状態グリフのまま。
  const iconUrl = useLoadedImage(
    !locked && node.icon_path && isStorageConfigured() ? getMaterialUrl(node.icon_path) : null,
  );

  /** 読み上げ用の状態語。見た目 (色・形) だけで区別させない。 */
  const stateText = obscured
    ? "まだ見えない"
    : fog
      ? "まだ先（開発者表示）"
      : cleared
        ? "クリア済み"
        : isActive
          ? "進行中"
          : locked
            ? "未解放"
            : "解放済み";

  const act = (run: () => void) => {
    setOpen(false);
    run();
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next && !onActivate()) return;
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${label}（${stateText}${celebration === "unlocked" ? "・新しく解放" : celebration === "appeared" ? "・新しく登場" : ""}）`}
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
                fog && obscured ? "opacity-45" : fog ? "opacity-70" : "",
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
                  obscured ? "tree-star-label-fog blur-[1.5px] select-none" : "",
                )}
              >
                {label}
              </span>
            ) : null}
            {celebration ? (
              <span className="tree-new-badge" aria-hidden="true">
                {celebration === "unlocked" ? "解放!" : "NEW"}
              </span>
            ) : null}
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent align="center" side="right" className="w-[280px]">
        <div className="text-[13px] font-semibold leading-snug">
          {obscured ? (
            // 名前はぼかしの予告だけ。読み上げにも流さない (状態語と本文で足りる)。
            <span aria-hidden="true" className="blur-[3px] select-none">
              {label}
            </span>
          ) : (
            label
          )}
        </div>
        <div className="mt-0.5 text-[11px] text-ink-3">{stateText}</div>

        {obscured ? (
          <p className="mt-2 text-[12px] text-ink-3">
            まだ先のスキルです。手前のスキルを進めるとはっきり見えてきます。
          </p>
        ) : locked ? (
          // ロック星に出してよいのは解放条件だけ (到達説明はそもそも届いていない)。
          <div className="mt-2 text-[12px] text-ink-3">
            <div className="font-semibold text-ink-2">解放条件</div>
            <div className="mt-0.5">
              {(node.lock_reasons ?? []).length > 0
                ? `${(node.lock_reasons ?? []).join(" / ")} をクリアすると開きます`
                : "前提のステージをクリアすると開きます"}
            </div>
          </div>
        ) : node.can_do ? (
          <p className="mt-2 text-[12px] text-ink-3">
            このスキルを身につけた人は <strong className="text-ink-2">{node.can_do}</strong>。
          </p>
        ) : null}

        {fog ? null : (
          <div className="mt-3 flex flex-wrap gap-2">
            {locked ? (
              <Button size="sm" variant="accent" onClick={() => act(() => onSkillCheck(node.id))}>
                <Sparkles size={12} />
                腕試しに挑戦（飛び級）
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => act(() => onSkillCheck(node.id))}>
                腕試しで力試し
              </Button>
            )}

            {/* 修了した星に着手の導線は出さない (サーバも切り替えを 400 で断る)。
                解放済みなら **割り当ての有無によらず** 始められる (Phase 3b) —
                受講登録は「ここから始める」を押した時点で自分で作る。
                キューだけは受講登録のある星に限る (キュー API が登録を要求するため)。 */}
            {!locked && !cleared && !isActive ? (
              <>
                <Button size="sm" onClick={() => act(() => onStartStage(node.id))}>
                  ここから始める
                </Button>
                {queued || !node.enrolled ? null : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => act(() => onQueueStage(node.id))}
                  >
                    <Plus size={12} />
                    キューに追加
                  </Button>
                )}
              </>
            ) : null}

            {cleared ? (
              <span className="inline-flex items-center gap-1 self-center text-[11.5px] text-ink-3">
                <Check size={12} />
                このスキルは修了済み
              </span>
            ) : null}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
