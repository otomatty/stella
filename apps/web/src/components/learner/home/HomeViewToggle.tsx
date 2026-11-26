/**
 * 受講者ホームの表示切り替え。
 * 画面の「カード」に対応する lanes は localStorage の stella_home_view_v1 に保存済みの識別子なので変えない。
 */
import { LayoutGrid, Network } from "@/lib/icons";
import { cn } from "@/lib/utils";

export type HomeView = "tree" | "lanes";

const HOME_VIEWS = [
  { view: "tree", label: "ツリー", Icon: Network },
  { view: "lanes", label: "カード", Icon: LayoutGrid },
] as const;

export const HomeViewToggle = ({
  value,
  onChange,
  className,
}: {
  value: HomeView;
  onChange: (view: HomeView) => void;
  className?: string;
}) => (
  <fieldset
    aria-label="表示"
    className={cn(
      "flex h-9 w-max shrink-0 items-center rounded-full border border-border bg-white/[0.86] p-0.5 shadow-sm backdrop-blur-md dark:bg-[rgba(12,14,24,0.78)]",
      className,
    )}
  >
    {HOME_VIEWS.map(({ view, label, Icon }) => (
      <button
        key={view}
        type="button"
        aria-pressed={value === view}
        className={cn(
          "inline-flex h-full items-center gap-1.5 rounded-full px-3 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
          value === view
            ? "bg-brand text-white dark:bg-[#a78bfa] dark:text-[#0c0e18]"
            : "text-ink-2 hover:bg-sunken",
        )}
        onClick={() => onChange(view)}
      >
        <Icon size={14} />
        {label}
      </button>
    ))}
  </fieldset>
);
