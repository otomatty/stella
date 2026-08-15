import { useState } from "react";
import { Video, Clock } from "@/lib/icons";
import { PageHeader } from "@/components/common/PageHeader";
import { CourseThumb } from "@/components/common/CourseThumb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Course } from "@/data/types";
import { cn } from "@/lib/utils";

interface CourseListProps {
  setPage: (page: string) => void;
  courses: Course[];
  setCurrentCourse: (c: Course) => void;
}

type Filter = "all" | "active" | "new" | "done";

export const CourseList = ({ setPage, courses, setCurrentCourse }: CourseListProps) => {
  const [filter, setFilter] = useState<Filter>("all");

  const shown = courses.filter((c) => {
    if (filter === "all") return true;
    if (filter === "active") return !c.completed && c.progress > 0;
    if (filter === "done") return Boolean(c.completed);
    if (filter === "new") return c.progress === 0;
    return true;
  });

  const tabs: Array<{ id: Filter; label: string; n: number }> = [
    { id: "all", label: "すべて", n: courses.length },
    {
      id: "active",
      label: "受講中",
      n: courses.filter((c) => !c.completed && c.progress > 0).length,
    },
    { id: "new", label: "未着手", n: courses.filter((c) => c.progress === 0).length },
    { id: "done", label: "完了", n: courses.filter((c) => c.completed).length },
  ];

  return (
    <>
      {/*
        ヘッダにあった「フィルター」「コースを探す」は撤去した (Issue #77)。
        前者は直下の絞り込みタブと重複、 後者は受講登録が管理者割当のみで
        自分でコースを追加する導線が存在しないため。
      */}
      <PageHeader title="コース一覧" sub="受講中・完了・未着手のコースを確認できます" />

      <div className="flex gap-1 items-center mb-6 pb-3 border-b border-border">
        {tabs.map((t) => (
          <Button
            key={t.id}
            size="sm"
            variant={filter === t.id ? "primary" : "ghost"}
            onClick={() => setFilter(t.id)}
          >
            {t.label}
            <span className="opacity-70 ml-1">{t.n}</span>
          </Button>
        ))}
      </div>

      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
      >
        {shown.map((c) => (
          <button
            type="button"
            key={c.id}
            onClick={() => {
              setCurrentCourse(c);
              setPage("course-detail");
            }}
            className={cn(
              "text-left bg-card border border-border rounded-lg overflow-hidden",
              "flex flex-col cursor-pointer transition-colors hover:border-border-strong",
            )}
          >
            <CourseThumb color={c.color} label={c.category} />
            <div className="p-4 flex flex-col gap-2 flex-1">
              <div className="flex flex-wrap gap-1.5 items-center">
                {c.completed ? (
                  <Badge variant="success">完了</Badge>
                ) : c.progress > 0 ? (
                  <Badge variant="accent">受講中</Badge>
                ) : (
                  <Badge>未着手</Badge>
                )}
                {c.required === true ? (
                  <Badge variant="warning">必須</Badge>
                ) : c.required === false ? (
                  <Badge variant="info">任意</Badge>
                ) : null}
                <span className="text-[11.5px] text-ink-3">{c.category}</span>
              </div>
              <div className="text-[15px] font-semibold leading-snug tracking-tight">{c.title}</div>
              <div className="text-[11.5px] text-ink-3 flex gap-3 items-center">
                <span className="flex items-center gap-1">
                  <Video size={11} /> {c.lessonsCount}レッスン
                </span>
                <span className="w-[3px] h-[3px] rounded-full bg-ink-4" />
                <span className="flex items-center gap-1">
                  <Clock size={11} /> 約{c.duration ?? 20}時間
                </span>
              </div>
              <Progress value={c.progress} tone="brand" className="mt-2" />
              <div className="mt-auto flex items-center justify-between text-xs text-ink-3">
                <span>
                  {c.progress === 0 ? "未着手" : c.completed ? "修了済み" : `${c.progress}% 完了`}
                </span>
                {c.dueAt && !c.completed ? (
                  <span className="text-[11.5px] text-ink-3">期限 {c.dueAt.slice(5)}</span>
                ) : null}
              </div>
            </div>
          </button>
        ))}
      </div>
    </>
  );
};
