/**
 * コース内のセクションとレッスンを drag-and-drop で並び替える管理 UI。
 *
 * - 外側 `DndContext` でセクション並び替え (`SortableContext` strategy=vertical)
 * - 各セクション行は内側 `DndContext` を持ち、 そこにレッスン用の `SortableContext` を張る
 * - クロスセクション (別セクションへレッスン移動) は MVP 範囲外 (TODO)。
 *   別セクションへ動かすには LessonEditor で section_id を変更する想定。
 */

import { useEffect, useState } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";

import { GripVertical, Plus, Edit, Trash } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import type {
  CourseWithChildren,
  LessonRow,
  LessonType,
  SectionRow,
} from "@falcon/shared/cms/types";
import {
  deleteLesson,
  deleteSection,
  reorderLessons,
  reorderSections,
  upsertLesson,
  upsertSection,
} from "@/lib/cms-api";
import { LessonEditor } from "./LessonEditor";

interface Props {
  course: CourseWithChildren;
  tenantId: string;
  onChange: () => Promise<void> | void;
}

interface LocalSection {
  section: SectionRow;
  lessons: LessonRow[];
}

const LESSON_TYPE_LABELS: Record<LessonType, string> = {
  video: "動画",
  slides: "スライド",
  text: "テキスト",
  quiz: "確認テスト",
  assignment: "課題提出",
  code: "コード演習",
};

export function SectionList({ course, tenantId, onChange }: Props) {
  const [sections, setSections] = useState<LocalSection[]>(course.sections);
  const [editingLesson, setEditingLesson] = useState<{
    sectionId: string;
    lesson: LessonRow | null;
  } | null>(null);

  useEffect(() => {
    setSections(course.sections);
  }, [course]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onSectionDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sections.findIndex((s) => s.section.id === active.id);
    const newIndex = sections.findIndex((s) => s.section.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(sections, oldIndex, newIndex);
    setSections(next);
    try {
      await reorderSections(
        course.course.id,
        next.map((s) => s.section.id),
      );
    } catch (err) {
      toast.error(`並び替え失敗: ${err instanceof Error ? err.message : "unknown"}`);
      await onChange();
    }
  };

  const onLessonDragEnd = async (sectionId: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const sectionIdx = sections.findIndex((s) => s.section.id === sectionId);
    if (sectionIdx === -1) return;
    const lessons = sections[sectionIdx].lessons;
    const oldIndex = lessons.findIndex((l) => l.id === active.id);
    const newIndex = lessons.findIndex((l) => l.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const nextLessons = arrayMove(lessons, oldIndex, newIndex);
    const nextSections = sections.map((s, i) =>
      i === sectionIdx ? { ...s, lessons: nextLessons } : s,
    );
    setSections(nextSections);
    try {
      await reorderLessons(
        sectionId,
        nextLessons.map((l) => l.id),
      );
    } catch (err) {
      toast.error(`並び替え失敗: ${err instanceof Error ? err.message : "unknown"}`);
      await onChange();
    }
  };

  const addSection = async () => {
    try {
      await upsertSection({
        course_id: course.course.id,
        title: "新しいセクション",
        order: sections.length,
      });
      await onChange();
    } catch (err) {
      toast.error(`セクション追加失敗: ${err instanceof Error ? err.message : "unknown"}`);
    }
  };

  const renameSection = async (section: SectionRow, title: string) => {
    if (title === section.title) return;
    try {
      await upsertSection({
        id: section.id,
        course_id: section.course_id,
        title,
        order: section.order,
      });
      await onChange();
    } catch (err) {
      toast.error(`セクション更新失敗: ${err instanceof Error ? err.message : "unknown"}`);
    }
  };

  const removeSection = async (sectionId: string) => {
    if (!confirm("このセクションと所属レッスンを削除します。 よろしいですか?")) return;
    try {
      await deleteSection(sectionId);
      await onChange();
    } catch (err) {
      toast.error(`削除失敗: ${err instanceof Error ? err.message : "unknown"}`);
    }
  };

  const addLesson = (sectionId: string) => {
    setEditingLesson({ sectionId, lesson: null });
  };

  const removeLesson = async (lessonId: string) => {
    if (!confirm("このレッスンを削除します。 よろしいですか?")) return;
    try {
      await deleteLesson(lessonId);
      await onChange();
    } catch (err) {
      toast.error(`削除失敗: ${err instanceof Error ? err.message : "unknown"}`);
    }
  };

  const onLessonSaved = async (sectionId: string, lessonId: string | null, partial: Omit<Parameters<typeof upsertLesson>[0], "id" | "section_id" | "order"> & { order?: number }) => {
    const currentSection = sections.find((s) => s.section.id === sectionId);
    const nextOrder = partial.order ?? (currentSection?.lessons.length ?? 0);
    try {
      await upsertLesson({
        ...partial,
        ...(lessonId ? { id: lessonId } : {}),
        section_id: sectionId,
        order: nextOrder,
      });
      await onChange();
      setEditingLesson(null);
    } catch (err) {
      toast.error(`レッスン保存失敗: ${err instanceof Error ? err.message : "unknown"}`);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onSectionDragEnd}>
        <SortableContext items={sections.map((s) => s.section.id)} strategy={verticalListSortingStrategy}>
          {sections.map((s) => (
            <SortableSection
              key={s.section.id}
              section={s.section}
              lessons={s.lessons}
              onRename={renameSection}
              onRemove={removeSection}
              onLessonDragEnd={onLessonDragEnd}
              onAddLesson={addLesson}
              onEditLesson={(lesson) =>
                setEditingLesson({ sectionId: s.section.id, lesson })
              }
              onRemoveLesson={removeLesson}
            />
          ))}
        </SortableContext>
      </DndContext>

      <Button type="button" variant="outline" onClick={() => void addSection()}>
        <Plus size={14} />
        セクションを追加
      </Button>

      {editingLesson ? (
        <LessonEditor
          tenantId={tenantId}
          courseId={course.course.id}
          sectionId={editingLesson.sectionId}
          lesson={editingLesson.lesson}
          onClose={() => setEditingLesson(null)}
          onSubmit={(partial) =>
            onLessonSaved(editingLesson.sectionId, editingLesson.lesson?.id ?? null, partial)
          }
        />
      ) : null}
    </div>
  );
}

interface SortableSectionProps {
  section: SectionRow;
  lessons: LessonRow[];
  onRename: (section: SectionRow, title: string) => Promise<void>;
  onRemove: (sectionId: string) => Promise<void>;
  onLessonDragEnd: (sectionId: string, event: DragEndEvent) => Promise<void>;
  onAddLesson: (sectionId: string) => void;
  onEditLesson: (lesson: LessonRow) => void;
  onRemoveLesson: (lessonId: string) => Promise<void>;
}

function SortableSection({
  section,
  lessons,
  onRename,
  onRemove,
  onLessonDragEnd,
  onAddLesson,
  onEditLesson,
  onRemoveLesson,
}: SortableSectionProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  return (
    <div ref={setNodeRef} style={style} className="bg-card border border-border rounded-md">
      <div className="flex items-center gap-2 px-2 py-2 border-b border-border">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab text-ink-3 hover:text-foreground p-1"
          aria-label="ドラッグして並び替え"
        >
          <GripVertical size={16} />
        </button>
        <input
          type="text"
          defaultValue={section.title}
          onBlur={(e) => void onRename(section, e.target.value.trim() || section.title)}
          className="flex-1 bg-transparent text-[14px] font-semibold focus:outline-none focus:bg-sunken rounded-sm px-1.5 py-0.5"
        />
        <Button type="button" size="icon-sm" variant="ghost" onClick={() => void onRemove(section.id)}>
          <Trash size={13} />
        </Button>
      </div>

      <div className="p-2">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(e) => void onLessonDragEnd(section.id, e)}
        >
          <SortableContext items={lessons.map((l) => l.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-1">
              {lessons.map((l) => (
                <SortableLesson
                  key={l.id}
                  lesson={l}
                  onEdit={() => onEditLesson(l)}
                  onRemove={() => void onRemoveLesson(l.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <div className="mt-2">
          <Button type="button" size="sm" variant="ghost" onClick={() => onAddLesson(section.id)}>
            <Plus size={13} />
            レッスンを追加
          </Button>
        </div>
      </div>
    </div>
  );
}

interface SortableLessonProps {
  lesson: LessonRow;
  onEdit: () => void;
  onRemove: () => void;
}

function SortableLesson({ lesson, onEdit, onRemove }: SortableLessonProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lesson.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 px-2 py-1.5 rounded-sm border border-transparent hover:border-border hover:bg-sunken/60"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab text-ink-3 hover:text-foreground"
        aria-label="ドラッグして並び替え"
      >
        <GripVertical size={14} />
      </button>
      <span className="text-[11px] uppercase tracking-wider text-ink-3 w-16 shrink-0">
        {LESSON_TYPE_LABELS[lesson.type]}
      </span>
      <span className="flex-1 text-[13px] truncate">{lesson.title}</span>
      <span className="text-[11.5px] text-ink-3">{lesson.duration_label ?? ""}</span>
      <Button type="button" size="icon-sm" variant="ghost" onClick={onEdit}>
        <Edit size={13} />
      </Button>
      <Button type="button" size="icon-sm" variant="ghost" onClick={onRemove}>
        <Trash size={13} />
      </Button>
    </div>
  );
}
