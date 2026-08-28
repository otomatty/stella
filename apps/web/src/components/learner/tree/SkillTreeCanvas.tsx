/**
 * スキルツリーの盤面 — Miro のようにドラッグで動かせるパン / ズームのキャンバス。
 *
 * ## ライブラリを足さずポインタイベントで書く
 *
 * 必要なのは「平行移動 + 拡大縮小の transform を 1 つ持ち、ドラッグ / ホイール /
 * ピンチで更新する」ことだけで、React Flow のようなノードエディタ (ノードの編集・
 * 接続・選択矩形) は要らない。依存を足すより、状態が 1 つの小さな実装を選ぶ。
 *
 * ## 操作
 *
 * - 背景のドラッグ … パン (星のボタンや操作ボタンの上からは始めない)
 * - ホイール / 2 本指ピンチ … カーソル位置を中心にズーム
 * - 右上のボタン … 拡大 / 縮小 / 全体を表示 (キーボードでも操作できる導線)
 *
 * ## キーボードとフォーカス
 *
 * 星は `<button>` のままなので Tab で辿れる。ただし transform で動かした星は
 * ブラウザの自動スクロールでは見えないため、フォーカスされた星が盤面の外なら
 * こちらでパンして視界に入れる (`onFocusCapture`)。overflow はブラウザに
 * スクロールさせない (`overflow-hidden` + transform) — スクロールと transform の
 * 二重管理になると座標が合わなくなる。
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode, RefObject } from "react";

import { Button } from "@/components/ui/button";
import { Maximize2, ZoomIn, ZoomOut } from "@/lib/icons";
import { cn } from "@/lib/utils";

import type { RadialBounds } from "./radial-layout";

/** ズームの範囲。下限は「全体が見える」より少し引ける程度、上限は文字が粗れない程度。 */
const MIN_SCALE = 0.25;
const MAX_SCALE = 2;
/**
 * 下限のさらに下限。狭い画面では全体表示が `MIN_SCALE` より小さい倍率を要るので
 * そこまでは下げるが、いくらなんでもこれ以上は縮めない (箱の大きさが取れない
 * ときに 0 や負の倍率へ落ちるのを防ぐ番人でもある)。
 */
const ABSOLUTE_MIN_SCALE = 0.05;
/** ボタン 1 押しぶんのズーム倍率。 */
const STEP_SCALE = 1.25;
/** 全体表示のときに盤面の周囲へ残す余白 (px)。 */
const FIT_PAD = 24;

interface Transform {
  x: number;
  y: number;
  scale: number;
}

/** 2 本指の状態。中点 (cx, cy) と指の間隔 (distance)。 */
interface PinchState {
  cx: number;
  cy: number;
  distance: number;
}

const clampScale = (scale: number, floor: number) => Math.min(MAX_SCALE, Math.max(floor, scale));

/** 親 (SkillTree) から盤面を操作するためのハンドル。 */
export interface SkillTreeCanvasHandle {
  /** 盤面座標 (x, y) が視界に入るようにパンする (フォーカス追従用)。 */
  ensureVisible: (x: number, y: number) => void;
  /** 全体を表示に戻す。 */
  fit: () => void;
}

interface SkillTreeCanvasProps {
  /** 盤面 (中身) の大きさ (px)。 */
  worldWidth: number;
  worldHeight: number;
  /**
   * 星が実際に広がっている範囲 (盤面座標)。パンの可動域をこれで決める。
   * 盤面の矩形ではなく星の外接を使う理由は `constrain` の説明を参照。
   */
  contentBounds: RadialBounds;
  /**
   * 操作ハンドルの受け口。`useRef<SkillTreeCanvasHandle | null>(null)` を渡す。
   * (この画面の親子は 1 対 1 なので、forwardRef より素直な受け渡しにする。)
   */
  handleRef?: RefObject<SkillTreeCanvasHandle | null>;
  children: ReactNode;
  className?: string;
}

/** パン開始を無視する要素 (星や操作ボタンの上ではドラッグを始めない)。 */
function isInteractive(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest("button, a, input, [role='dialog']") !== null;
}

/** 1 行ぶんのホイール送り量の px 換算 (`DOM_DELTA_LINE` 用のおおよその行高)。 */
const WHEEL_LINE_HEIGHT = 16;
/** 1 イベントで動かす量の上限 (px)。ページ単位の送りで一気に端まで飛ばさない。 */
const WHEEL_MAX_PX = 200;

/**
 * ホイールの送り量を px に揃える。
 *
 * `deltaY` の単位は `deltaMode` で変わる (ピクセル / 行 / ページ)。行単位を出す
 * ブラウザ・ドライバでは 1 目盛りが 3 程度になるので、px 前提のまま拡縮に使うと
 * 「ホイールを回してもほとんど拡大しないのにページのスクロールだけ止まる」になる。
 */
function wheelDeltaPx(e: WheelEvent, viewportHeight: number): number {
  const px =
    e.deltaMode === 1
      ? e.deltaY * WHEEL_LINE_HEIGHT
      : e.deltaMode === 2
        ? e.deltaY * viewportHeight
        : e.deltaY;
  return Math.max(-WHEEL_MAX_PX, Math.min(WHEEL_MAX_PX, px));
}

export const SkillTreeCanvas = ({
  worldWidth,
  worldHeight,
  contentBounds,
  handleRef,
  children,
  className,
}: SkillTreeCanvasProps) => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });
  /**
   * ドラッグ / ピンチ中の指の位置。state にすると 1 移動ごとに再レンダーが 2 回
   * (指の位置 + transform) 走るので、指の追跡だけ ref に持つ。
   */
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  /**
   * 2 本指の直前の状態。**ペアとして**持つ (中点と指の間隔)。
   * 指ごとに前回位置を持って混ぜると、拡縮が震え平行移動が消える (下記)。
   */
  const pinch = useRef<PinchState | null>(null);
  /**
   * 受講者が自分で動かしたか (パン / ズーム)。箱の大きさが変わったときに、
   * 全体表示へ組み直してよいか / いまの見え方を保つべきかの判断に使う。
   */
  const touched = useRef(false);
  const [dragging, setDragging] = useState(false);
  /** プログラム起点の移動 (フィット / フォーカス追従) だけ transition を効かせる。 */
  const [animated, setAnimated] = useState(false);

  /**
   * 星の集まりを完全に画面外へ出さない。パン / ズームで見失うと「何も無い画面」
   * だけが残り、戻る手がかりが右上のボタンしか無くなる。
   *
   * 判定は「**視界の中心が指す盤面上の点** を、星の外接範囲 (`contentBounds`) を
   * `EDGE_SLACK` だけ広げた中に留める」形にする。この形だと
   *
   * - **どの星も画面の中央へ持ってこられる** (星の座標は必ず外接範囲の中にある)。
   *   拡大したときに外周の星へポインタで届かない、が起きない
   * - 星の広がりから `EDGE_SLACK` より遠くへは離れられない
   *
   * が同時に成り立つ。盤面の矩形では判定しない — 盤面は円に外接する正方形で四隅が
   * 空白なので、「隅だけ見えていて星は全部画面外」を許してしまう。
   */
  const constrain = useCallback(
    (t: Transform): Transform => {
      const viewport = viewportRef.current;
      if (!viewport) return t;
      const EDGE_SLACK = 120;
      // offset = 盤面の原点が画面のどこにあるか。視界の中心が指す盤面上の点は
      // (span / 2 - offset) / scale なので、それが [min, max] に収まる offset に丸める。
      const clampAxis = (span: number, min: number, max: number, offset: number) =>
        Math.min(
          span / 2 - (min - EDGE_SLACK) * t.scale,
          Math.max(span / 2 - (max + EDGE_SLACK) * t.scale, offset),
        );
      return {
        ...t,
        x: clampAxis(viewport.clientWidth, contentBounds.minX, contentBounds.maxX, t.x),
        y: clampAxis(viewport.clientHeight, contentBounds.minY, contentBounds.maxY, t.y),
      };
    },
    [contentBounds],
  );

  /**
   * 盤面がちょうど収まる倍率。**手の届く下限 (`MIN_SCALE`) では頭打ちにしない** —
   * 狭い画面 (スマホ・分割表示) では全体表示にそれより小さい倍率が要るので、
   * 「全体を表示」が全体を出せなくなる。
   */
  const fitScaleOf = useCallback(
    (vw: number, vh: number) =>
      Math.min(
        MAX_SCALE,
        Math.max(
          ABSOLUTE_MIN_SCALE,
          Math.min((vw - FIT_PAD * 2) / worldWidth, (vh - FIT_PAD * 2) / worldHeight, 1),
        ),
      ),
    [worldWidth, worldHeight],
  );

  /**
   * 手で縮められる下限。ふだんは `MIN_SCALE` だが、全体表示にそれより小さい倍率が
   * 要る画面ではそこまで下げる。**下げないと、全体表示のあと縮小ボタンが逆に拡大**
   * してしまう (下限で丸められて倍率が上がる)。
   */
  const zoomFloor = useRef(MIN_SCALE);
  const updateZoomFloor = useCallback(
    (vw: number, vh: number) => {
      if (vw <= 0 || vh <= 0) return;
      zoomFloor.current = Math.min(MIN_SCALE, fitScaleOf(vw, vh));
    },
    [fitScaleOf],
  );

  // `fitView` の名は biome が `fit()` をテストの focus と誤認しないため。
  const fitView = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport || worldWidth <= 0 || worldHeight <= 0) return;
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    if (vw <= 0 || vh <= 0) return;
    const scale = fitScaleOf(vw, vh);
    updateZoomFloor(vw, vh);
    setAnimated(true);
    // 全体表示に戻したら「見ている場所」も無い状態に戻す (下の resize の扱いを参照)。
    touched.current = false;
    setTransform({
      x: (vw - worldWidth * scale) / 2,
      y: (vh - worldHeight * scale) / 2,
      scale,
    });
  }, [worldWidth, worldHeight, fitScaleOf, updateZoomFloor]);

  // 初回と盤面サイズの変化時は全体を見せるところから始める。
  // (星の増減 = 教材の公開でしか起きないので、閲覧中に不意に動く心配はない。)
  useLayoutEffect(() => {
    fitView();
  }, [fitView]);

  /**
   * 箱の大きさが変わったら、いまの見え方を作り直す。
   *
   * 変換は `clientWidth` / `clientHeight` を使って組んであるので、箱だけが変わると
   * 中身が寄ったまま / はみ出したままになる (画面の回転、ウィンドウのリサイズ、
   * サイドバーの開閉。この盤面は `65vh` で親の幅にも追従する)。
   *
   * **まだ触っていないときだけ全体表示に組み直し、触ったあとは可動域へ丸めるだけ**に
   * する。リサイズのたびに全体表示へ戻すと、拡大して見ている最中にウィンドウを
   * 動かしただけで見ていた場所を失う。
   */
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (touched.current) {
        // 触ったあとは見え方を保つが、縮小の下限だけは新しい箱に合わせておく
        // (このあと「全体を表示」を押したときに全体が出るように)。
        updateZoomFloor(viewport.clientWidth, viewport.clientHeight);
        setTransform((t) => constrain(t));
      } else {
        fitView();
      }
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [constrain, fitView, updateZoomFloor]);

  const zoomAt = useCallback(
    (cx: number, cy: number, factor: number) => {
      setAnimated(false);
      touched.current = true;
      setTransform((prev) => {
        const scale = clampScale(prev.scale * factor, zoomFloor.current);
        if (scale === prev.scale) return prev;
        // カーソル直下の盤面上の点が動かないように平行移動を合わせる。
        return constrain({
          scale,
          x: cx - ((cx - prev.x) / prev.scale) * scale,
          y: cy - ((cy - prev.y) / prev.scale) * scale,
        });
      });
    },
    [constrain],
  );

  /** 視界の中心を基準にボタンでズームする。 */
  const zoomByButton = (factor: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    zoomAt(viewport.clientWidth / 2, viewport.clientHeight / 2, factor);
  };

  /**
   * ピンチ 1 手ぶん: 中点の直下にある盤面上の点を保ったまま拡縮し、そのあと
   * 中点が動いたぶんだけ平行移動する (2 本指で「つまんで運ぶ」を成立させる)。
   */
  const pinchTo = useCallback(
    (cx: number, cy: number, dx: number, dy: number, factor: number) => {
      setAnimated(false);
      setTransform((prev) => {
        const scale = clampScale(prev.scale * factor, zoomFloor.current);
        return constrain({
          scale,
          x: cx - ((cx - prev.x) / prev.scale) * scale + dx,
          y: cy - ((cy - prev.y) / prev.scale) * scale + dy,
        });
      });
    },
    [constrain],
  );

  // ホイールズームは preventDefault が要るので React の onWheel (passive) では書けない。
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = viewport.getBoundingClientRect();
      zoomAt(
        e.clientX - rect.left,
        e.clientY - rect.top,
        Math.exp(-wheelDeltaPx(e, viewport.clientHeight) * 0.002),
      );
    };
    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  /** いま触れている 2 点の中点と間隔。2 点ちょうどでなければ null。 */
  const pinchStateOf = (): PinchState | null => {
    const points = [...pointers.current.values()];
    const [a, b] = points;
    if (points.length !== 2 || !a || !b) return null;
    return {
      cx: (a.x + b.x) / 2,
      cy: (a.y + b.y) / 2,
      distance: Math.hypot(a.x - b.x, a.y - b.y),
    };
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    // 星のボタンからはドラッグを始めない (クリックとパンを両立させる線引き)。
    if (isInteractive(e.target)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    // 指の数が変わったらピンチの起点を取り直す (前のペアと混ぜない)。
    pinch.current = pinchStateOf();
    setDragging(true);
    setAnimated(false);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const current = { x: e.clientX, y: e.clientY };
    // 先に更新して、以降は「いま触れている全部の点」で見る。
    pointers.current.set(e.pointerId, current);
    touched.current = true;

    if (pointers.current.size >= 2) {
      /**
       * 2 本指: 直前のペア (中点と間隔) と、いまのペアを**丸ごと**比べる。
       *
       * 動いた指の古い位置ともう片方の新しい位置を混ぜると、片方の指のイベントで
       * 付いた拡縮をもう片方のイベントが打ち消し、指についてくるはずの平行移動も
       * 消える (両指を同じ向きに動かしても、震えるだけでほとんど動かない)。
       */
      const next = pinchStateOf();
      const before = pinch.current;
      pinch.current = next;
      const viewport = viewportRef.current;
      if (!next || !before || !viewport || before.distance <= 0) return;
      const rect = viewport.getBoundingClientRect();
      pinchTo(
        next.cx - rect.left,
        next.cy - rect.top,
        next.cx - before.cx,
        next.cy - before.cy,
        next.distance / before.distance,
      );
      return;
    }

    // 1 本指 / マウス: パン。
    setTransform((t) =>
      constrain({ ...t, x: t.x + current.x - prev.x, y: t.y + current.y - prev.y }),
    );
  };

  const onPointerEnd = (e: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    // 指が減ったらピンチの起点は捨てる。次の移動で取り直す (1 フレーム待つだけ)。
    pinch.current = null;
    if (pointers.current.size === 0) setDragging(false);
  };

  const ensureVisible = useCallback(
    (x: number, y: number) => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      setTransform((prev) => {
        const vx = x * prev.scale + prev.x;
        const vy = y * prev.scale + prev.y;
        const margin = 72;
        const vw = viewport.clientWidth;
        const vh = viewport.clientHeight;
        if (vx >= margin && vx <= vw - margin && vy >= margin && vy <= vh - margin) return prev;
        setAnimated(true);
        // フォーカス追従で動かした先も「見ている場所」。箱が変わっても保つ。
        touched.current = true;
        // 外にいる星は視界の中央へ連れてくる (端に寄せるとポップオーバーがはみ出す)。
        // ここも `constrain` を通す — 通さないと可動域の外へ出られてしまい、
        // 次のホイール / ドラッグで引き戻されてフォーカス中の星が画面外へ消える。
        // (星の座標は必ず可動域の中なので、この丸めで中央寄せが崩れることはない。)
        return constrain({ ...prev, x: vw / 2 - x * prev.scale, y: vh / 2 - y * prev.scale });
      });
    },
    [constrain],
  );

  useEffect(() => {
    if (handleRef) handleRef.current = { ensureVisible, fit: fitView };
    return () => {
      if (handleRef) handleRef.current = null;
    };
  }, [handleRef, ensureVisible, fitView]);

  return (
    <div
      ref={viewportRef}
      className={cn(
        "relative overflow-hidden rounded-lg border border-border bg-sunken/40",
        dragging ? "cursor-grabbing" : "cursor-grab",
        className,
      )}
      style={{ touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onFocusCapture={(e) => {
        // Tab で盤面の外の星に着いたら、その星まで自動でパンする。
        const el = e.target;
        if (!(el instanceof HTMLElement)) return;
        const { treeX, treeY } = el.dataset;
        if (treeX !== undefined && treeY !== undefined) {
          ensureVisible(Number(treeX), Number(treeY));
        }
      }}
    >
      <div
        className={cn("absolute left-0 top-0", animated && "transition-transform duration-200")}
        style={{
          width: worldWidth,
          height: worldHeight,
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: "0 0",
        }}
      >
        {children}
      </div>

      {/* 操作ボタン。マウスを使わない人の拡縮の導線でもある。 */}
      <div className="absolute right-2 top-2 flex flex-col gap-1">
        <Button
          size="icon-sm"
          variant="outline"
          aria-label="拡大"
          onClick={() => zoomByButton(STEP_SCALE)}
        >
          <ZoomIn size={14} />
        </Button>
        <Button
          size="icon-sm"
          variant="outline"
          aria-label="縮小"
          onClick={() => zoomByButton(1 / STEP_SCALE)}
        >
          <ZoomOut size={14} />
        </Button>
        <Button size="icon-sm" variant="outline" aria-label="全体を表示" onClick={fitView}>
          <Maximize2 size={14} />
        </Button>
      </div>

      <div className="pointer-events-none absolute bottom-2 left-3 text-[10.5px] text-ink-4">
        ドラッグで移動 · ホイール / ピンチで拡大縮小
      </div>
    </div>
  );
};
