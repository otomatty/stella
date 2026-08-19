/**
 * Drawer — 画面端から出てくるボトムシート / サイドシート。
 *
 * shadcn/ui の Drawer (vaul) と同じ使い勝手を、 既に入っている
 * `@radix-ui/react-dialog` の上に自前で組んだもの (依存追加なし)。
 * Dialog と同じく focus trap / scroll lock / Esc 閉じを Radix から貰いつつ、
 * - `direction` で bottom / top / left / right から出す
 * - ハンドルのドラッグでスワイプ閉じ
 * を足している。
 *
 * モバイルでは Drawer、 デスクトップでは Dialog / 独自パネル…… という出し分けは
 * 呼び出し側で `useIsMobileViewport()` を見て切り替える (例: `AIChatBot`)。
 */

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

type DrawerDirection = "bottom" | "top" | "left" | "right";

/** ドラッグでこの距離を超えたら閉じる (px)。 */
const DISMISS_DISTANCE_PX = 96;
/** 距離が足りなくても、 この速度 (px/ms) を超えて弾かれたら閉じる。 */
const DISMISS_VELOCITY = 0.5;

/**
 * 閉じる向きへの移動量 (px) と所要時間 (ms) から、 指を離したときに閉じるかを決める。
 * ゆっくり大きく引いても、 短く速く弾いても閉じる。
 */
export function shouldDismissDrawer(travelledPx: number, elapsedMs: number): boolean {
  if (travelledPx > DISMISS_DISTANCE_PX) {
    return true;
  }
  return travelledPx > 0 && travelledPx / Math.max(elapsedMs, 1) > DISMISS_VELOCITY;
}
/** 閉じる向きと逆にドラッグしたときの「引っぱり」の減衰率。 */
const RUBBER_BAND = 8;

/** direction ごとの「閉じる向き」。 axis 上で正なら +1、 負なら -1。 */
const DISMISS_AXIS: Record<DrawerDirection, { axis: "x" | "y"; sign: 1 | -1 }> = {
  bottom: { axis: "y", sign: 1 },
  top: { axis: "y", sign: -1 },
  left: { axis: "x", sign: -1 },
  right: { axis: "x", sign: 1 },
};

const drawerContentVariants = cva(
  "fixed z-[100] flex flex-col overflow-hidden bg-card text-foreground shadow-lg outline-hidden",
  {
    variants: {
      direction: {
        bottom:
          "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-xl border-t border-border data-[state=open]:animate-drawer-in-bottom data-[state=closed]:animate-drawer-out-bottom",
        top: "inset-x-0 top-0 max-h-[92dvh] rounded-b-xl border-b border-border data-[state=open]:animate-drawer-in-top data-[state=closed]:animate-drawer-out-top",
        left: "inset-y-0 left-0 w-[86vw] max-w-sm rounded-r-xl border-r border-border data-[state=open]:animate-drawer-in-left data-[state=closed]:animate-drawer-out-left",
        right:
          "inset-y-0 right-0 w-[86vw] max-w-sm rounded-l-xl border-l border-border data-[state=open]:animate-drawer-in-right data-[state=closed]:animate-drawer-out-right",
      },
    },
    defaultVariants: { direction: "bottom" },
  },
);

const Drawer = DialogPrimitive.Root;
const DrawerTrigger = DialogPrimitive.Trigger;
const DrawerPortal = DialogPrimitive.Portal;
const DrawerClose = DialogPrimitive.Close;

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-[100] bg-black/60 data-[state=open]:animate-drawer-overlay-in data-[state=closed]:animate-drawer-overlay-out",
      className,
    )}
    {...props}
  />
));
DrawerOverlay.displayName = DialogPrimitive.Overlay.displayName;

export interface DrawerContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof drawerContentVariants> {
  /** ドラッグ用のつまみを出すか。 既定は bottom / top のときだけ true。 */
  showHandle?: boolean;
  /** overlay に追加でクラスを当てたいとき (`lg:hidden` など)。 */
  overlayClassName?: string;
}

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DrawerContentProps
>(
  (
    { className, overlayClassName, children, direction = "bottom", showHandle, style, ...props },
    forwardedRef,
  ) => {
    const dir: DrawerDirection = direction ?? "bottom";
    const withHandle = showHandle ?? (dir === "bottom" || dir === "top");

    const closeRef = React.useRef<HTMLButtonElement | null>(null);
    const drag = useDrawerDrag(dir, () => closeRef.current?.click());

    return (
      <DrawerPortal>
        <DrawerOverlay className={overlayClassName} />
        <DialogPrimitive.Content
          ref={forwardedRef}
          className={cn(
            drawerContentVariants({ direction: dir }),
            // ドラッグ中は指に追従させたいので transition を切る。
            drag.dragging ? "transition-none" : "transition-transform duration-200 ease-out",
            className,
          )}
          // ドラッグの transform は利用側の style より後に置いて、 追従が消えないようにする。
          style={{ ...style, ...drag.style }}
          {...props}
        >
          {withHandle ? (
            /* ポインタ操作専用の補助 UI。 キーボードからは Esc / 閉じるボタンで閉じられる。 */
            <div
              className={cn(
                "shrink-0 cursor-grab touch-none py-2.5 active:cursor-grabbing",
                dir === "top" ? "order-last" : undefined,
              )}
              onPointerDown={drag.onPointerDown}
              onPointerMove={drag.onPointerMove}
              onPointerUp={drag.onPointerEnd}
              onPointerCancel={drag.onPointerEnd}
            >
              <div
                className="mx-auto h-1.5 w-11 rounded-full bg-border-strong"
                aria-hidden="true"
              />
            </div>
          ) : null}
          {children}
          {/* ドラッグで閉じるための実装都合の Close。 ヘッダ側の DrawerClose と重複するので、
              タブ順にも支援技術にも出さない。 */}
          <DialogPrimitive.Close
            ref={closeRef}
            tabIndex={-1}
            aria-hidden="true"
            className="sr-only"
          />
        </DialogPrimitive.Content>
      </DrawerPortal>
    );
  },
);
DrawerContent.displayName = "DrawerContent";

const DrawerHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex shrink-0 flex-col gap-1 border-b border-border px-4 py-3 text-left",
      className,
    )}
    {...props}
  />
);
DrawerHeader.displayName = "DrawerHeader";

const DrawerFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "mt-auto flex shrink-0 flex-col-reverse gap-2 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
      className,
    )}
    {...props}
  />
);
DrawerFooter.displayName = "DrawerFooter";

const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-sm font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DrawerTitle.displayName = DialogPrimitive.Title.displayName;

const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-xs text-ink-3", className)}
    {...props}
  />
));
DrawerDescription.displayName = DialogPrimitive.Description.displayName;

interface DrawerDragApi {
  dragging: boolean;
  style: React.CSSProperties | undefined;
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerEnd: (event: React.PointerEvent<HTMLElement>) => void;
}

/**
 * ハンドルのドラッグでシートを追従させ、 一定距離 / 速度を超えたら `onDismiss` を呼ぶ。
 * 閉じる向きと逆へのドラッグはゴムのように減衰させて、 端で止まって見えるようにする。
 */
function useDrawerDrag(direction: DrawerDirection, onDismiss: () => void): DrawerDragApi {
  const { axis, sign } = DISMISS_AXIS[direction];
  const [offset, setOffset] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const originRef = React.useRef<{ point: number; time: number } | null>(null);

  const readPoint = React.useCallback(
    (event: React.PointerEvent<HTMLElement>) => (axis === "y" ? event.clientY : event.clientX),
    [axis],
  );

  const onPointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (event.button !== 0) {
        return;
      }
      event.currentTarget.setPointerCapture(event.pointerId);
      originRef.current = { point: readPoint(event), time: event.timeStamp };
      setDragging(true);
    },
    [readPoint],
  );

  const onPointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const origin = originRef.current;
      if (!origin) {
        return;
      }
      const travelled = (readPoint(event) - origin.point) * sign;
      setOffset(travelled >= 0 ? travelled : travelled / RUBBER_BAND);
    },
    [readPoint, sign],
  );

  const onPointerEnd = React.useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const origin = originRef.current;
      originRef.current = null;
      setDragging(false);
      if (!origin) {
        return;
      }
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      const travelled = (readPoint(event) - origin.point) * sign;
      if (shouldDismissDrawer(travelled, event.timeStamp - origin.time)) {
        // offset は戻さない。 指を離した位置を起点に、 閉じ animation でそのまま画面外へ抜ける。
        // (Content は Presence が消すので、 次に開くときは新しい mount = offset 0 から始まる)
        onDismiss();
        return;
      }
      setOffset(0);
    },
    [onDismiss, readPoint, sign],
  );

  const style = React.useMemo<React.CSSProperties | undefined>(() => {
    if (offset === 0) {
      // 0 のときは inline transform を外して、 開閉アニメーションに任せる。
      return undefined;
    }
    const px = offset * sign;
    return {
      transform: axis === "y" ? `translate3d(0, ${px}px, 0)` : `translate3d(${px}px, 0, 0)`,
    };
  }, [axis, offset, sign]);

  return { dragging, style, onPointerDown, onPointerMove, onPointerEnd };
}

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};
