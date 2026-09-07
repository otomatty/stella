/**
 * 殿堂の詳細 — 1 人ぶんの物語 (Phase 5)。
 *
 * 上から 夜空のヒーロー (星座の点灯) → 実名・ジョブ・大きな引用 → 歩んだ道 → 4 章。
 *
 * ## 「この道をたどる」CTA
 *
 * 出すのは **閲覧者が受講者で、サーバが行き先を返したときだけ**。行き先 (`follow`) は
 * 掲載された道のうち閲覧者が未クリアで開始できる最初のステージで、判定はサーバの
 * スキルマップが持つ (画面は判定しない)。無ければ CTA ごと出さない — 「あなたには
 * 辿れません」と書くくらいなら黙って出さない方がよい。殿堂は他人の物語を読む場所で
 * あって、自分の遅れを突きつけられる場所ではない。
 *
 * CTA は既存のシグネチャ (`--sf-gradient`) を使う唯一の場所。夜空の中でここだけが
 * アプリ本体と地続きであることを示す。
 */

import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";

import { HOF_CHAPTERS } from "@stella/shared/hall-of-fame/types";
import type { HallOfFameChapters, HallOfFamePathStage } from "@stella/shared/hall-of-fame/types";

import { ChevronLeft } from "@/lib/icons";
import { isBackendConfigured } from "@/lib/backend";
import {
  getHallOfFameEntry,
  type HallOfFameDetail as HallOfFameDetailPayload,
  type HallOfFameFollow,
} from "@/lib/hall-of-fame-api";
import { startStage } from "@/lib/skill-map-api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Constellation } from "@/components/hall-of-fame/Constellation";
import {
  HOF_PROVENANCE_NOTE,
  HofAvatar,
  HofJobTag,
  HofPlaceholder,
  HofQuote,
  HofSurface,
} from "@/components/hall-of-fame/hof-ui";

/**
 * 掲載の中身だけを描く部分 (本人の記入画面のプレビューが同じものを使う)。
 *
 * 名前の見出しレベルは呼び出し側が決める。詳細ページでは名前が **そのページの h1** で、
 * 以下の「歩んだ道」と 4 章が h2 になる。プレビュー (記入画面 / 管理のダイアログ) は
 * 既に外側に h1 があるので h2 から始める — どちらも階層が飛ばない。
 */
export function HallOfFameStory({
  name,
  initials,
  jobTitle,
  quote,
  chapters,
  path,
  nameAs: NameTag = "h2",
}: {
  name: string;
  initials?: string | null;
  jobTitle: string;
  quote: string;
  chapters: HallOfFameChapters;
  path: HallOfFamePathStage[];
  nameAs?: "h1" | "h2";
}) {
  /** 名前が h1 なら節は h2、名前が h2 なら節は h3。 */
  const SectionTag = NameTag === "h1" ? "h2" : "h3";
  return (
    <>
      {/* 星座は道があるときだけ。無いとき (公開前のプレビュー) は帯ごと出さず、
          本文を負のマージンで引き上げない — 引き上げると夜空の外へはみ出す。 */}
      {path.length > 0 ? (
        <Constellation stages={path} className="w-full h-32 sm:h-44 block" />
      ) : null}

      <div
        className={cn("px-6 sm:px-10 pb-10 max-w-3xl mx-auto", path.length > 0 ? "-mt-4" : "pt-8")}
      >
        <div className="flex items-center gap-4">
          <HofAvatar name={name} initials={initials} size="lg" />
          <div className="min-w-0">
            <NameTag className="text-[17px] sm:text-[19px] font-semibold">{name}</NameTag>
            <HofJobTag job={jobTitle} className="mt-1.5" />
          </div>
        </div>

        <HofQuote quote={quote} size="lg" className="mt-8" />

        {path.length > 0 ? (
          <section className="mt-10">
            <SectionTag
              className="text-[11px] tracking-[0.2em] font-semibold"
              style={{ color: "var(--hof-gold)" }}
            >
              歩んだ道
            </SectionTag>
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-2 mt-3">
              {path.map((stage, i) => (
                <li key={stage.id} className="flex items-center gap-2">
                  {i > 0 ? (
                    <span aria-hidden="true" style={{ color: "var(--hof-line)" }}>
                      —
                    </span>
                  ) : null}
                  <span
                    className="hof-ring rounded-full px-3 py-1 text-[12px]"
                    style={{ color: "var(--hof-ink)" }}
                  >
                    {stage.title}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <div className="mt-12 flex flex-col gap-10">
          {HOF_CHAPTERS.map((chapter, i) => {
            const body = chapters[chapter.key];
            if (!body.trim()) return null;
            return (
              <section key={chapter.key}>
                <div className="flex items-baseline gap-3">
                  <span
                    className="hof-serif text-[22px] leading-none"
                    style={{ color: "var(--hof-gold)" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <SectionTag className="hof-serif text-[16px] sm:text-[18px]">
                    {chapter.label}
                  </SectionTag>
                </div>
                <p
                  className="mt-3 text-[13.5px] leading-[2] whitespace-pre-line"
                  style={{ color: "var(--hof-ink-2)" }}
                >
                  {body}
                </p>
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}

export function HallOfFameDetail({
  entryId,
  canFollow,
}: {
  entryId: string;
  /** 閲覧者が自分の学習を始められるか (staff の画面には CTA を出さない)。 */
  canFollow: boolean;
}) {
  const navigate = useNavigate();
  const [entry, setEntry] = useState<HallOfFameDetailPayload | null>(null);
  const [follow, setFollow] = useState<HallOfFameFollow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!isBackendConfigured()) {
      setLoading(false);
      return () => undefined;
    }
    setLoading(true);
    void (async () => {
      try {
        const data = await getHallOfFameEntry(entryId);
        if (cancelled) return;
        setEntry(data.entry);
        setFollow(data.follow);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "取得に失敗しました");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [entryId]);

  /**
   * その星から始める。開始 (自己開始 API) は冪等なので、既に受講中の星でもそのまま
   * 通り、ステージ詳細へ進む。「押したのに何も起きない」を作らないための一本道。
   */
  const onFollow = useCallback(async () => {
    if (!follow) return;
    setFollowing(true);
    try {
      await startStage(follow.stage_id);
      await navigate({ to: "/stages/$stageId", params: { stageId: follow.stage_id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "ステージを開始できませんでした");
      setFollowing(false);
    }
  }, [follow, navigate]);

  return (
    <HofSurface>
      <div>
        <div className="px-6 sm:px-10 pt-6">
          <Link
            to="/hall-of-fame"
            className="inline-flex items-center gap-1 text-[12px]"
            style={{ color: "var(--hof-ink-2)" }}
          >
            <ChevronLeft size={14} />
            殿堂へ戻る
          </Link>
        </div>

        {error ? (
          <p className="px-6 sm:px-10 py-10 text-[13px]" style={{ color: "var(--hof-gold-2)" }}>
            {error}
          </p>
        ) : null}

        {loading && !entry ? (
          <div className="px-6 sm:px-10 py-10 max-w-3xl mx-auto">
            <HofPlaceholder className="h-28 w-full" />
            <HofPlaceholder className="h-6 w-40 mt-6" />
            <HofPlaceholder className="h-4 w-full mt-4" />
          </div>
        ) : null}

        {entry ? (
          <>
            <HallOfFameStory
              name={entry.name}
              initials={entry.initials}
              jobTitle={entry.job_title}
              quote={entry.quote}
              chapters={entry.chapters}
              path={entry.path}
              nameAs="h1"
            />

            <div className="px-6 sm:px-10 pb-12 max-w-3xl mx-auto">
              {canFollow && follow ? (
                <div
                  className="rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4"
                  style={{ border: "1px solid var(--hof-line)" }}
                >
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-semibold">この道をたどる</div>
                    <div className="text-[12px] mt-1" style={{ color: "var(--hof-ink-2)" }}>
                      次の一歩は「{follow.stage_title}」です。
                    </div>
                  </div>
                  <Button
                    variant="accent"
                    size="lg"
                    className="sm:ml-auto"
                    disabled={following}
                    onClick={() => void onFollow()}
                  >
                    {following ? "開いています…" : `${follow.stage_title} を始める`}
                  </Button>
                </div>
              ) : null}

              <p className="mt-8 text-[11.5px]" style={{ color: "var(--hof-ink-2)" }}>
                {HOF_PROVENANCE_NOTE}
              </p>
            </div>
          </>
        ) : null}
      </div>
    </HofSurface>
  );
}
