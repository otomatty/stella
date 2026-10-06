/**
 * ログインなしで読める導入案内 (Issue #41。07 §12.1 の手順 1)。
 *
 * `/start` に公開の単元 (教材の `unit.json` に `"public": true`) のレッスンを並べ、
 * `/start/<レッスン id>` で本文を読ませる。VS Code を入れる前の受講者が、ログインの前に
 * 読む `dev-env-basics` の最初の単元 (06 の U00〜U01) を想定している。
 *
 * 認証付きのシェル (`_app`) の外に置き、公開 API (`GET /api/public/*`) だけを読む。
 * 進捗は記録しない (未ログインの閲覧を、あとでログインした人の進捗に混ぜない)。
 * ログイン済みの人が開いても同じ内容を出し、ログインの代わりにホームへの導線を出す。
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import type { PublicLessonSummary, PublicUnit } from "@stella/shared/cms/types";
import { Brand } from "@/components/common/Brand";
import { LessonTypeIcon, lessonTypeLabel } from "@/components/learner/StageDetail";
import { LessonMarkdown, PlainMarkdownSlides } from "@/components/learner/MarkdownSlides";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SkeletonRows } from "@/components/ui/skeleton";
import { usePublicLesson, usePublicUnits } from "@/hooks/usePublicContent";
import { getSession, signInWithGoogle, subscribeToAuth } from "@/lib/auth-client";
import { isBackendConfigured } from "@/lib/backend";
import { ChevronLeft, ChevronRight, Clock, ExternalLink, Google, Home } from "@/lib/icons";

/** VS Code の公式の入手先 (06 §3: 公式配布元を案内する)。手順そのものは公開の単元に書く。 */
const VSCODE_DOWNLOAD_URL = "https://code.visualstudio.com/";

/** ログイン済みか (端末に有効なトークンがあるか)。API は呼ばない。 */
function useSignedIn(): boolean {
  const [signedIn, setSignedIn] = useState(() => getSession() !== null);
  useEffect(() => subscribeToAuth((session) => setSignedIn(session !== null)), []);
  return signedIn;
}

/** ログイン (未ログイン) かホームへ (ログイン済み)。 */
function SignInOrHome({ size = "default" }: { size?: "default" | "lg" }) {
  const signedIn = useSignedIn();
  if (signedIn)
    return (
      <Button asChild variant="outline" size={size}>
        <a href="/">
          <Home size={14} aria-hidden="true" />
          ホームへ
        </a>
      </Button>
    );
  const signIn = () => {
    // バックエンド未設定 (デモ) はログイン画面のモックログインへ回す。
    if (!isBackendConfigured()) {
      window.location.assign("/");
      return;
    }
    try {
      signInWithGoogle();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ログインを開始できませんでした");
    }
  };
  return (
    <Button type="button" variant="primary" size={size} onClick={signIn}>
      <Google width={14} height={14} />
      Googleでログイン
    </Button>
  );
}

function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-[880px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/start" aria-label="導入案内のトップへ">
            <Brand size="sm" />
          </Link>
          <SignInOrHome />
        </div>
      </header>
      <main className="mx-auto w-full max-w-[880px] px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}

/** ログインのあとに進む先。ページの末尾に置く。 */
function NextSteps() {
  const signedIn = useSignedIn();
  return (
    <section className="mt-10 rounded-lg border border-border bg-card p-5">
      <h2 className="mb-2 text-[15px] font-semibold">
        {signedIn ? "続きはアプリで進めます" : "ここから先はログインして進めます"}
      </h2>
      <p className="mb-4 text-[12.5px] leading-relaxed text-ink-3">
        {signedIn
          ? "VS Code の準備ができたら、課題の「VS Code で開く」から VS Code の拡張を学習サイトにつなぎます。"
          : "VS Code の準備ができたら、Google アカウントでログインします。ログインしたあと、課題の「VS Code で開く」から VS Code の拡張を学習サイトにつなぎます。"}
      </p>
      <SignInOrHome size="lg" />
    </section>
  );
}

function LessonRow({ lesson }: { lesson: PublicLessonSummary }) {
  return (
    <li>
      <Link
        to="/start/$lessonId"
        params={{ lessonId: lesson.id }}
        className="flex items-center gap-3 px-4 py-3 text-[13.5px] hover:bg-sunken"
      >
        <span className="text-ink-3">
          <LessonTypeIcon type={lesson.type} size={14} />
        </span>
        <span className="flex-1">{lesson.title}</span>
        <span className="text-[11.5px] text-ink-3">{lessonTypeLabel[lesson.type]}</span>
        {lesson.duration_label ? (
          <span className="hidden text-[11.5px] text-ink-3 sm:inline">{lesson.duration_label}</span>
        ) : null}
        <ChevronRight size={14} className="text-ink-3" aria-hidden="true" />
      </Link>
    </li>
  );
}

function UnitList({ units }: { units: PublicUnit[] }) {
  return (
    <div className="space-y-4">
      {units.map((unit) => (
        <section key={unit.id} className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <div className="text-[11.5px] text-ink-3">{unit.stage_title}</div>
            <h2 className="text-[15px] font-semibold">{unit.title}</h2>
          </div>
          <ul className="divide-y divide-border">
            {unit.lessons.map((lesson) => (
              <LessonRow key={lesson.id} lesson={lesson} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** `/start` — 導入案内のトップ。 */
export function PublicStartPage() {
  const { data: units, loading, error } = usePublicUnits();
  const first = units[0]?.lessons[0];
  return (
    <PublicShell>
      <h1 className="mb-2 text-[24px] font-semibold tracking-tight">はじめての方へ</h1>
      <p className="mb-6 text-[13.5px] leading-relaxed text-ink-3">
        {
          "研修では VS Code を使って学習します。ログインの前に、ここで学習の準備を進めてください。このページはログインしなくても読めます。"
        }
      </p>

      <ol className="mb-8 space-y-2 text-[13.5px] leading-relaxed">
        <li>
          1. 下の案内を読み、VS Code を入れます (
          <a
            href={VSCODE_DOWNLOAD_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-0.5 text-brand underline underline-offset-2"
          >
            VS Code の公式サイト
            <ExternalLink size={12} aria-hidden="true" />
          </a>
          )。
        </li>
        <li>2. Google アカウントでログインします。</li>
        <li>3. 課題の「VS Code で開く」から、VS Code の拡張を学習サイトにつなぎます。</li>
      </ol>

      {loading ? (
        <SkeletonRows rows={4} />
      ) : error ? (
        <p className="rounded-md border border-border bg-card p-4 text-[12.5px] text-ink-3">
          案内を読み込めませんでした。時間をおいて開き直してください。
        </p>
      ) : units.length === 0 ? (
        <p className="rounded-md border border-border bg-card p-4 text-[12.5px] text-ink-3">
          導入案内の本文は準備中です。講師の案内に従って VS Code を準備してください。
        </p>
      ) : (
        <>
          {first ? (
            <Button asChild variant="accent" size="lg" className="mb-6">
              <Link to="/start/$lessonId" params={{ lessonId: first.id }}>
                最初から読む
                <ChevronRight size={14} aria-hidden="true" />
              </Link>
            </Button>
          ) : null}
          <UnitList units={units} />
        </>
      )}

      <NextSteps />
    </PublicShell>
  );
}

/** `/start/<レッスン id>` — 公開のレッスン 1 件。 */
export function PublicLessonPage({ lessonId }: { lessonId: string }) {
  const { data: lesson, loading, error } = usePublicLesson(lessonId);
  const { data: units } = usePublicUnits();
  const ordered = useMemo(() => units.flatMap((u) => u.lessons), [units]);
  const index = ordered.findIndex((l) => l.id === lessonId);
  const prev = index > 0 ? ordered[index - 1] : undefined;
  const next = index >= 0 ? ordered[index + 1] : undefined;
  const unit = units.find((u) => u.id === lesson?.unit_id);
  const indexInUnit = unit ? unit.lessons.findIndex((l) => l.id === lessonId) : -1;

  return (
    <PublicShell>
      <Link
        to="/start"
        className="mb-4 inline-flex items-center gap-1 text-[12.5px] text-ink-3 hover:text-foreground"
      >
        <ChevronLeft size={14} aria-hidden="true" />
        はじめての方へ
      </Link>

      {loading ? (
        <SkeletonRows rows={6} />
      ) : error ? (
        <p className="rounded-md border border-border bg-card p-4 text-[12.5px] text-ink-3">
          レッスンを読み込めませんでした。時間をおいて開き直してください。
        </p>
      ) : !lesson ? (
        <div className="rounded-md border border-border bg-card p-6 text-center">
          <div className="mb-1 text-[13.5px] font-semibold">このページは見つかりません</div>
          <p className="text-[12.5px] text-ink-3">
            ログインしてから読む教材かもしれません。導入案内のトップから開き直してください。
          </p>
        </div>
      ) : (
        <article>
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <Badge variant="accent" className="bg-sf-magenta-soft font-bold text-sf-magenta-ink">
              <LessonTypeIcon type={lesson.type} size={10} />
              {lessonTypeLabel[lesson.type]}
            </Badge>
            <span className="text-[11.5px] text-ink-3">
              {lesson.unit_title}
              {unit && indexInUnit >= 0 ? ` · ${indexInUnit + 1} / ${unit.lessons.length}` : ""}
            </span>
          </div>
          <h1 className="text-[22px] font-black leading-[1.3] tracking-[0.01em]">{lesson.title}</h1>
          {lesson.duration_label ? (
            <div className="mb-5 mt-1 flex items-center gap-1 text-[12.5px] text-ink-3">
              <Clock size={12} aria-hidden="true" /> {lesson.duration_label}
            </div>
          ) : (
            <div className="mb-5" />
          )}
          {lesson.type === "slides" ? (
            <PlainMarkdownSlides
              key={lesson.id}
              markdown={lesson.markdown}
              header={lesson.stage_title}
            />
          ) : (
            <div className="prose-lms">
              <LessonMarkdown>{lesson.markdown}</LessonMarkdown>
            </div>
          )}

          <nav
            aria-label="前後のレッスン"
            className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5"
          >
            {prev ? (
              <Button asChild variant="outline">
                <Link to="/start/$lessonId" params={{ lessonId: prev.id }}>
                  <ChevronLeft size={14} aria-hidden="true" />
                  {prev.title}
                </Link>
              </Button>
            ) : (
              <span />
            )}
            {next ? (
              <Button asChild variant="accent">
                <Link to="/start/$lessonId" params={{ lessonId: next.id }}>
                  {next.title}
                  <ChevronRight size={14} aria-hidden="true" />
                </Link>
              </Button>
            ) : null}
          </nav>
        </article>
      )}

      <NextSteps />
    </PublicShell>
  );
}
