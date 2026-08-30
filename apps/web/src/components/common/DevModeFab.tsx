/**
 * 開発者モードの FAB。スキルツリーで島を全表示し、霧の星の名前をぼかさない。
 *
 * サーバの `DEV_MODE` が立っているときだけ描く。本番に出さないためのゲート。
 */

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { FlaskConical } from "@/lib/icons";
import { isApiConfigured } from "@/lib/api-client";
import { isDevModeEnabled, setDevModeEnabled, subscribeDevMode } from "@/lib/dev-mode";
import { cn } from "@/lib/utils";

const SERVER_URL = (import.meta.env.VITE_SERVER_URL ?? "").replace(/\/+$/, "");

interface DevModeFabProps {
  /** AI FAB が右下にあるとき、その上に積む。無いときは同じ位置に置く。 */
  stackedAboveAi?: boolean;
}

export function DevModeFab({ stackedAboveAi = false }: DevModeFabProps) {
  const [available, setAvailable] = useState(false);
  const [on, setOn] = useState(isDevModeEnabled);

  useEffect(() => subscribeDevMode(setOn), []);

  useEffect(() => {
    if (!isApiConfigured()) return;
    const ac = new AbortController();
    void fetch(`${SERVER_URL}/api/healthz`, { signal: ac.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { devModeAvailable?: boolean } | null) => {
        if (body?.devModeAvailable === true) setAvailable(true);
      })
      .catch(() => {
        // 疎通できないときは出さない (本番相当)。
      });
    return () => ac.abort();
  }, []);

  const toggle = useCallback(() => {
    setDevModeEnabled(!isDevModeEnabled());
  }, []);

  if (!available) return null;

  return (
    <Button
      type="button"
      variant={on ? "accent" : "outline"}
      size="icon"
      onClick={toggle}
      aria-pressed={on}
      title={on ? "開発者モード: オン（すべてのステージを表示）" : "開発者モード: オフ"}
      aria-label={on ? "開発者モードをオフにする" : "開発者モードをオンにする"}
      className={cn(
        "fixed right-6 w-12 h-12 rounded-full shadow-lg z-[90]",
        stackedAboveAi
          ? "bottom-[calc(5.25rem+env(safe-area-inset-bottom))]"
          : "bottom-[calc(1.5rem+env(safe-area-inset-bottom))]",
      )}
    >
      <FlaskConical size={18} />
    </Button>
  );
}
