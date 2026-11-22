import "@fontsource/noto-sans-jp/500.css";
import "@fontsource/noto-sans-jp/700.css";
import "@fontsource/jetbrains-mono/400.css";
import { useEffect, useState } from "react";
import { useDelayRender } from "remotion";

export function useSceneFonts(japanese: string, code: string) {
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [handle] = useState(() => delayRender("場面のフォントを読み込む"));

  useEffect(() => {
    let active = true;
    Promise.all([
      document.fonts.load("500 40px 'Noto Sans JP'", japanese),
      document.fonts.load("700 40px 'Noto Sans JP'", japanese),
      document.fonts.load("400 34px 'JetBrains Mono'", code),
    ])
      .then(() => document.fonts.ready)
      .then(() => {
        if (active) continueRender(handle);
      })
      .catch((error: unknown) => {
        if (active) cancelRender(error instanceof Error ? error : String(error));
      });
    return () => {
      active = false;
    };
  }, [handle, japanese, code, continueRender, cancelRender]);
}
