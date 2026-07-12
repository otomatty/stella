/**
 * `/admin/courses` — コース一覧 + 編集画面 (内部 state でルーティング)。
 *
 * AdminGeneric の courses 分岐の置き換え。 fixtures ではなく DB の courses テーブルを読む。
 */

import { useState } from "react";
import { toast } from "sonner";

import { Plus, MoreHorizontal, Edit } from "@/lib/icons";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CourseThumb } from "@/components/common/CourseThumb";
import type { CourseColor, CourseRow } from "@falcon/shared/cms/types";
import {
  deleteCourse,
  setCourseStatus,
  upsertCourse,
} from "@/lib/cms-api";
import { useCmsCourses } from "@/hooks/useCmsCourses";
import { CourseEditor } from "./CourseEditor";

interface Props {
  tenantId: string;
}

export function AdminCoursesPage({ tenantId }: Props) {
  const { courses, loading, error, refetch } = useCmsCourses(tenantId);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (editingId) {
    return (
      <CourseEditor
        courseId={editingId}
        tenantId={tenantId}
        onBack={() => setEditingId(null)}
        onMetadataChanged={refetch}
      />
    );
  }

  const onCreate = async () => {
    const baseSlug = `course-${Date.now().toString(36)}`;
    try {
      const row = await upsertCourse({
        tenant_id: tenantId,
        slug: baseSlug,
        title: "新しいコース",
        status: "draft",
        color: "indigo",
      });
      await refetch();
      setEditingId(row.id);
    } catch (err) {
      toast.error(`コース作成失敗: ${err instanceof Error ? err.message : "unknown"}`);
    }
  };

  const onTogglePublish = async (course: CourseRow) => {
    try {
      await setCourseStatus(
        course.id,
        course.status === "published" ? "draft" : "published",
      );
      await refetch();
    } catch (err) {
      toast.error(`状態切替失敗: ${err instanceof Error ? err.message : "unknown"}`);
    }
  };

  const onDelete = async (course: CourseRow) => {
    if (!confirm(`コース "${course.title}" を削除します。 セクション / レッスンも一緒に消えます。`)) return;
    try {
      await deleteCourse(course.id);
      await refetch();
    } catch (err) {
      toast.error(`削除失敗: ${err instanceof Error ? err.message : "unknown"}`);
    }
  };

  return (
    <>
      <PageHeader
        title="コース管理"
        sub="公開状態 / セクション・レッスン / 教材アップロード"
        actions={
          <Button variant="accent" onClick={() => void onCreate()}>
            <Plus size={14} />
            新規コース
          </Button>
        }
      />

      {error ? (
        <div className="mb-4 rounded-md border border-destructive bg-danger-soft px-3 py-2 text-[12.5px] text-destructive">
          {error}
        </div>
      ) : null}

      {loading && courses.length === 0 ? (
        <div className="text-sm text-ink-3 py-10 text-center">読み込み中…</div>
      ) : courses.length === 0 ? (
        <div className="text-sm text-ink-3 py-10 text-center border border-dashed border-border rounded-md">
          まだコースがありません。 「新規コース」 ボタンから作成してください。
        </div>
      ) : (
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
        >
          {courses.map((c) => (
            <CourseCard
              key={c.id}
              course={c}
              onEdit={() => setEditingId(c.id)}
              onTogglePublish={() => void onTogglePublish(c)}
              onDelete={() => void onDelete(c)}
            />
          ))}
        </div>
      )}
    </>
  );
}

interface CourseCardProps {
  course: CourseRow;
  onEdit: () => void;
  onTogglePublish: () => void;
  onDelete: () => void;
}

function CourseCard({ course, onEdit, onTogglePublish, onDelete }: CourseCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const color: CourseColor = course.color ?? "indigo";
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden flex flex-col">
      <div className="relative">
        <CourseThumb color={color} />
        <div className="absolute top-2.5 left-2.5">
          {course.status === "published" ? (
            <Badge variant="success">公開中</Badge>
          ) : course.status === "draft" ? (
            <Badge>下書き</Badge>
          ) : (
            <Badge variant="danger">アーカイブ</Badge>
          )}
        </div>
        <div className="absolute top-2.5 right-2.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="bg-card"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <MoreHorizontal size={13} />
          </Button>
          {menuOpen ? (
            <div className="absolute right-0 mt-1 w-44 bg-card border border-border rounded-md shadow-lg z-10 text-[12.5px]">
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-sunken"
                onClick={() => {
                  setMenuOpen(false);
                  onTogglePublish();
                }}
              >
                {course.status === "published" ? "下書きに戻す" : "公開する"}
              </button>
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-sunken text-destructive"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete();
                }}
              >
                削除
              </button>
            </div>
          ) : null}
        </div>
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="text-[15px] font-semibold leading-snug tracking-tight">
          {course.title}
        </div>
        <div className="text-[11.5px] text-ink-3 flex gap-3 items-center">
          {course.category ? <span>{course.category}</span> : null}
          {course.duration_hours ? <span>{course.duration_hours}h</span> : null}
        </div>
        <div className="mt-auto flex items-center justify-between text-xs">
          <span className="text-[11.5px] text-ink-3">
            最終更新 {new Date(course.updated_at).toLocaleDateString("ja-JP")}
          </span>
          <Button size="sm" onClick={onEdit}>
            <Edit size={12} />
            編集
          </Button>
        </div>
      </div>
    </div>
  );
}
