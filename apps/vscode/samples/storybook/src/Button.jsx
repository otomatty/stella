/**
 * 画面の主な操作に使うボタン。
 * @param {{ variant?: "primary" | "secondary", disabled?: boolean,
 *   onClick?: () => void, children: import("react").ReactNode }} props
 */
export function Button({
  variant = "primary",
  disabled = false,
  onClick,
  children,
}) {
  return (
    <button
      type="button"
      className={`button button--${variant}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
