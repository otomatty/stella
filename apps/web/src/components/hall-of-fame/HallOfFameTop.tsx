/**
 * 殿堂のトップ (Phase 5)。
 *
 * 並びは **新着順** (公開した順)。数値は 1 つも出さない — 件数もレベルも XP も、
 * 「並べ替えられるもの」を置いた瞬間に殿堂は順位表になる。
 *
 * カードに出すのは実名・ジョブ (名乗り)・引用・ともした星の頭 3 つだけ。
 */

import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

import { isBackendConfigured } from "@/lib/backend";
import { listHallOfFame, type HallOfFameCard } from "@/lib/hall-of-fame-api";
import {
  HOF_PROVENANCE_NOTE,
  HofAvatar,
  HofJobTag,
  HofPlaceholder,
  HofQuote,
  HofStarChip,
  HofSurface,
} from "@/components/hall-of-fame/hof-ui";

export function HallOfFameTop() {
  const [entries, setEntries] = useState<HallOfFameCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isBackendConfigured()) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setEntries(await listHallOfFame());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <HofSurface>
      <header className="px-6 sm:px-10 pt-12 pb-10 text-center">
        {/* 殿堂は独自のトーンで描くので `PageHeader` を使わない。見出し階層は
            ここから始まる (以下、詳細の章立てまで h1 → h2 の順)。 */}
        <h1
          className="hof-serif text-[30px] sm:text-[38px] tracking-[0.3em]"
          style={{ color: "var(--hof-gold)" }}
        >
          殿堂
        </h1>
        <p className="mt-4 text-[12.5px] leading-relaxed" style={{ color: "var(--hof-ink-2)" }}>
          {HOF_PROVENANCE_NOTE}
        </p>
      </header>

      <div className="px-4 sm:px-8 pb-12">
        {error ? (
          <p className="text-center text-[13px]" style={{ color: "var(--hof-gold-2)" }}>
            殿堂の取得に失敗しました: {error}
          </p>
        ) : null}

        {loading && entries.length === 0 && !error ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 max-w-5xl mx-auto">
            {["a", "b", "c"].map((key) => (
              <div key={key} className="hof-panel-bg rounded-xl p-5">
                <HofPlaceholder className="h-11 w-11 rounded-full" />
                <HofPlaceholder className="h-4 w-32 mt-4" />
                <HofPlaceholder className="h-3 w-full mt-3" />
              </div>
            ))}
          </div>
        ) : null}

        {!loading && entries.length === 0 && !error ? (
          <p
            className="text-center text-[12.5px] leading-relaxed"
            style={{ color: "var(--hof-ink-2)" }}
          >
            まだ掲載されている方はいません。
            <br />
            殿堂は、運営からの招待に本人が承諾したときにだけ開きます。
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 max-w-5xl mx-auto">
          {entries.map((entry) => (
            <Link
              key={entry.id}
              to="/hall-of-fame/$entryId"
              params={{ entryId: entry.id }}
              className="hof-panel-bg rounded-xl p-5 flex flex-col gap-3 transition-colors focus-visible:outline-none focus-visible:ring-2"
              style={{ outlineColor: "var(--hof-gold)" }}
            >
              <div className="flex items-center gap-3">
                <HofAvatar name={entry.name} initials={entry.initials} />
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold truncate">{entry.name}</div>
                  <HofJobTag job={entry.job_title} className="mt-1" />
                </div>
              </div>
              <HofQuote quote={entry.quote} />
              {entry.path_preview.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mt-auto pt-1">
                  {entry.path_preview.map((stage) => (
                    <HofStarChip key={stage.id} title={stage.title} />
                  ))}
                </div>
              ) : null}
            </Link>
          ))}
        </div>
      </div>
    </HofSurface>
  );
}
