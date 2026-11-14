import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { StageWithChildren } from "@stella/shared/cms/types";
import { LessonMarkdown, PlainMarkdownSlides } from "@/components/learner/MarkdownSlides";
import { SlideLessonMedia } from "@/components/learner/SlideLessonMedia";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SkeletonRows } from "@/components/ui/skeleton";
import { getStageWithChildren } from "@/lib/cms-api";
import { VideoStatusBadge } from "./VideoStatusBadge";
import {
  adjacentStageLessons,
  groupStageSections,
  lessonVideoStatus,
  LESSON_TYPE_LABELS,
} from "./staff-stage-detail";

export function StaffLessonView({ stageId, lessonId }: { stageId: string; lessonId: string }) {
  const [data, setData] = useState<StageWithChildren | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    const { signal } = controller;
    setLoading(true);
    setData(null);
    setError(null);
    try {
      const content = await getStageWithChildren(stageId, signal);
      if (signal.aborted) return;
      if (!content) throw new Error("ステージが見つかりません");
      setData(content);
    } catch (err) {
      if (!signal.aborted) setError(err instanceof Error ? err.message : "取得に失敗しました");
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [stageId]);
  useEffect(() => {
    void load();
    return () => pending.current?.abort();
  }, [load]);

  const sections = data ? groupStageSections(data, []) : [];
  const section = sections.find((section) =>
    section.lessons.some((lesson) => lesson.id === lessonId),
  );
  const lesson = section?.lessons.find((lesson) => lesson.id === lessonId);
  const status = lesson ? lessonVideoStatus(lesson) : "none";
  const adjacent = data ? adjacentStageLessons(data, lessonId) : null;
  const outline = (
    <nav aria-label="レッスンの並び" className="space-y-4">
      {sections.map(({ section, lessons }) => (
        <div key={section.id}>
          <h2 className="mb-2 text-sm font-semibold">{section.title}</h2>
          <ul className="space-y-1">
            {lessons.map((item) => {
              const itemStatus = lessonVideoStatus(item);
              return (
                <li key={item.id}>
                  <Link
                    to="/stages/$stageId/lessons/$lessonId"
                    params={{ stageId, lessonId: item.id }}
                    aria-current={item.id === lessonId ? "page" : undefined}
                    className={`flex flex-wrap items-center gap-2 rounded p-2 text-[13px] text-brand hover:underline ${item.id === lessonId ? "bg-brand-soft font-semibold" : ""}`}
                  >
                    <span className="min-w-0 break-words">{item.title}</span>
                    {itemStatus === "stale" || itemStatus === "missing" ? (
                      <VideoStatusBadge status={itemStatus} />
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-5 p-4 md:p-6">
      <Link
        to="/stages/$stageId"
        params={{ stageId }}
        search={{ tab: "outline" }}
        className="text-sm text-brand hover:underline"
      >
        ← {data?.stage.title ?? "ステージ詳細"}
      </Link>
      {loading ? (
        <SkeletonRows />
      ) : error ? (
        <div className="space-y-3">
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
          <Button onClick={() => void load()}>再読み込み</Button>
        </div>
      ) : !lesson || !data ? (
        <p>このレッスンは見つかりません</p>
      ) : (
        <>
          <header className="space-y-2">
            <p className="text-sm text-ink-3">{section?.section.title}</p>
            <h1 className="break-words text-xl font-bold">{lesson.title}</h1>
            <Badge>{LESSON_TYPE_LABELS[lesson.type]}</Badge>
          </header>
          <div className="grid min-w-0 gap-6 md:grid-cols-[16rem_minmax(0,1fr)]">
            <aside className="hidden md:block">{outline}</aside>
            <details className="md:hidden">
              <summary className="cursor-pointer text-sm font-semibold">レッスンの並び</summary>
              <div className="mt-3">{outline}</div>
            </details>
            <div className="min-w-0 space-y-5">
              {lesson.type === "slides" ? (
                <SlideLessonMedia lessonId={lesson.id} videoPath={lesson.video_path}>
                  {lesson.markdown ? (
                    <PlainMarkdownSlides markdown={lesson.markdown} header={data.stage.title} />
                  ) : (
                    <p>スライドの本文がありません</p>
                  )}
                </SlideLessonMedia>
              ) : lesson.type === "text" && lesson.markdown ? (
                <div className="prose-lms">
                  <LessonMarkdown>{lesson.markdown}</LessonMarkdown>
                </div>
              ) : (
                <p className="text-sm text-ink-2">
                  このレッスンは{LESSON_TYPE_LABELS[lesson.type]}
                  です。受講者と同じ画面で確かめるときは、ステージ詳細の『受講者の画面で確かめる』を使います
                </p>
              )}
              {lesson.type === "slides" ? (
                <Card className="space-y-3 p-4">
                  <h2 className="text-sm font-semibold">管理者向けの情報</h2>
                  <dl className="grid gap-2 text-sm sm:grid-cols-[auto_minmax(0,1fr)]">
                    <dt className="font-medium">動画</dt>
                    <dd>{status === "none" ? "動画なし" : <VideoStatusBadge status={status} />}</dd>
                    {lesson.video_issue ? (
                      <>
                        <dt className="font-medium">理由</dt>
                        <dd className="whitespace-pre-wrap break-words">{lesson.video_issue}</dd>
                      </>
                    ) : null}
                    <dt className="font-medium">受講者の画面</dt>
                    <dd>
                      {
                        {
                          published: "『動画』を既定で表示します",
                          stale: "『動画』を既定で表示します (前の版の動画)",
                          missing: "スライドだけを表示します",
                          none: "スライドだけを表示します (台本がありません)",
                        }[status]
                      }
                    </dd>
                    {status === "stale" || status === "missing" ? (
                      <>
                        <dt className="font-medium">直し方</dt>
                        <dd>次のデプロイで自動で作り直します。成功した動画は作り直しません。</dd>
                      </>
                    ) : null}
                  </dl>
                </Card>
              ) : null}
              <nav
                aria-label="前後のレッスン"
                className="flex flex-wrap justify-between gap-4 text-sm"
              >
                {adjacent?.previous ? (
                  <Link
                    to="/stages/$stageId/lessons/$lessonId"
                    params={{ stageId, lessonId: adjacent.previous.id }}
                    className="text-brand hover:underline"
                  >
                    ← {adjacent.previous.title}
                  </Link>
                ) : null}
                {adjacent?.next ? (
                  <Link
                    to="/stages/$stageId/lessons/$lessonId"
                    params={{ stageId, lessonId: adjacent.next.id }}
                    className="ml-auto text-brand hover:underline"
                  >
                    {adjacent.next.title} →
                  </Link>
                ) : null}
              </nav>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
