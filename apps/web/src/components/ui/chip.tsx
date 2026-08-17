import { cn } from "@/lib/utils";

/** 絞り込み・トグル用の丸チップ。 面談対策の受講者画面と講師の割当画面で共用する。 */
export function Chip({
  active,
  children,
  onClick,
  disabled = false,
  ariaLabel,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  /** 同じラベルのチップが並ぶ場合に、 何に対する操作かを読み上げへ伝える */
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={ariaLabel}
      className={cn(
        "px-2.5 py-1 rounded-full text-[12px] border cursor-pointer transition-colors",
        "disabled:opacity-50 disabled:cursor-default",
        active
          ? "sf-gradient-bg text-white border-transparent font-bold"
          : "bg-card text-ink-2 border-border hover:bg-sunken",
      )}
    >
      {children}
    </button>
  );
}
