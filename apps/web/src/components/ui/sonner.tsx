// 色は sonner の CSS 変数で当てる（レイヤー外の CSS に Tailwind utilities が負けるため）。
import type { CSSProperties } from "react";
import { Toaster as SonnerToaster } from "sonner";
import { useTheme } from "@/hooks/useTheme";

export const Toaster = () => {
  const { theme } = useTheme();

  return (
    <SonnerToaster
      theme={theme}
      position="bottom-center"
      style={
        {
          "--normal-bg": "var(--bg-raised)",
          "--normal-text": "var(--ink)",
          "--normal-border": "var(--line)",
        } as CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "flex items-center gap-2",
        },
      }}
    />
  );
};
