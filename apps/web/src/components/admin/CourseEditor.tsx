/**
 * 単一コースのメタデータ + セクション/レッスン構成を編集する画面。
 *
 * - 「下書き」 / 「公開」 を切り替えるトグルボタン (status カラムを更新)
 * - 削除ボタンは AdminCoursesPage 側のメニューに任せる (このコンポーネントでは扱わない)
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ChevronLeft, Save } from "@/lib/icons";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type {
  CourseColor,
  CourseStatus,
  CourseWithChildren,
} from "@falcon/shared/cms/types";
import { setCourseStatus, upsertCourse } from "@/lib/cms-api";
import { useCmsCourse } from "@/hooks/useCmsCourses";
import { SectionList } from "./SectionList";

interface Props {
  courseId: string;
  tenantId: string;
  onBack: () => void;
  /** AdminCoursesPage に course の status / title 変更を伝える (一覧の再取得用)。 */
  onMetadataChanged: () => Promise<void> | void;
}

const COLORS: { value: CourseColor; label: string }[] = [
  { value: "indigo", label: "Indigo" },
  { value: "green", label: "Green" },
  { value: "amber", label: "Amber" },
  { value: "slate", label: "Slate" },
];

export function CourseEditor({ courseId, tenantId, onBack, onMetadataChanged }: Props) {
  const { data, loading, error, refetch } = useCmsCourse(courseId);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setForm(fromCourse(data));
  }, [data]);

  const onSaveMeta = async () => {
    if (!form || !data) return;
    const cleanSlug = form.slug.trim();
    if (!cleanSlug) {
      toast.error("slug は必須です");
      return;
    }
    setSaving(true);
    try {
      await upsertCourse({
        id: data.course.id,
        tenant_id: tenantId,
        slug: cleanSlug,
        title: form.title,
        category: form.category || null,
        color: form.color,
        duration_hours: form.durationHours ? Number(form.durationHours) : null,
        description: form.description || null,
        instructor_name: form.instructorName.trim() || null,
        status: data.course.status,
        require_all_lessons: form.requireAllLessons,
        require_quiz_pass: form.requireQuizPass,
        require_assignment_pass: form.requireAssignmentPass,
        auto_issue_certificate: form.autoIssueCertificate,
      });
      toast.success("メタデータを保存しました");
      await refetch();
      await onMetadataChanged();
    } catch (err) {
      toast.error(`保存失敗: ${err instanceof Error ? err.message : "unknown"}`);
    } finally {
      setSaving(false);
    }
  };

  const onTogglePublish = async () => {
    if (!data) return;
    const next: CourseStatus = data.course.status === "published" ? "draft" : "published";
    try {
      await setCourseStatus(data.course.id, next);
      toast.success(next === "published" ? "公開しました" : "下書きに戻しました");
      await refetch();
      await onMetadataChanged();
    } catch (err) {
      toast.error(`状態切替失敗: ${err instanceof Error ? err.message : "unknown"}`);
    }
  };

  if (loading && !data) {
    return <div className="p-6 text-sm text-ink-3">読み込み中…</div>;
  }
  if (error) {
    return <div className="p-6 text-sm text-destructive">エラー: {error}</div>;
  }
  if (!data || !form) {
    return <div className="p-6 text-sm text-ink-3">コースが見つかりません</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`編集: ${form.title || "(無題)"}`}
        sub={`slug: ${data.course.slug}`}
        actions={
          <>
            <Button type="button" variant="outline" onClick={onBack}>
              <ChevronLeft size={14} />
              一覧に戻る
            </Button>
            <Badge variant={data.course.status === "published" ? "success" : "default"}>
              {data.course.status === "published" ? "公開中" : data.course.status === "draft" ? "下書き" : "アーカイブ"}
            </Badge>
            <Button
              type="button"
              variant={data.course.status === "published" ? "outline" : "accent"}
              onClick={() => void onTogglePublish()}
            >
              {data.course.status === "published" ? "下書きに戻す" : "公開する"}
            </Button>
          </>
        }
      />

      <section className="bg-card border border-border rounded-md p-5">
        <h3 className="text-sm font-semibold mb-3">メタデータ</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Label htmlFor="ce-title">タイトル</Label>
            <Input
              id="ce-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="ce-slug">slug</Label>
            <Input
              id="ce-slug"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className="font-mono text-[12.5px]"
            />
          </div>
          <div>
            <Label htmlFor="ce-cat">カテゴリ</Label>
            <Input
              id="ce-cat"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="ce-color">配色</Label>
            <select
              id="ce-color"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value as CourseColor })}
              className="h-10 w-full rounded-sm border border-input bg-card px-3 text-sm"
            >
              {COLORS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="ce-dur">想定時間 (時間)</Label>
            <Input
              id="ce-dur"
              type="number"
              value={form.durationHours}
              onChange={(e) => setForm({ ...form, durationHours: e.target.value })}
            />
          </div>
          <div className="col-span-3">
            <Label htmlFor="ce-instructor">講師名</Label>
            <Input
              id="ce-instructor"
              value={form.instructorName}
              onChange={(e) => setForm({ ...form, instructorName: e.target.value })}
              placeholder="例: 堀江 太郎"
            />
            <p className="mt-1 text-[12px] text-ink-3">
              受講者のコース詳細 / レッスン画面に表示されます。 未入力の場合は表示されません。
            </p>
          </div>
          <div className="col-span-3">
            <Label htmlFor="ce-desc">説明</Label>
            <Textarea
              id="ce-desc"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button type="button" variant="primary" disabled={saving} onClick={() => void onSaveMeta()}>
            <Save size={14} />
            メタデータを保存
          </Button>
        </div>
      </section>

      <section className="bg-card border border-border rounded-md p-5">
        <h3 className="text-sm font-semibold mb-1">修了基準</h3>
        <p className="text-[12px] text-ink-3 mb-3">
          有効にした条件をすべて満たすと修了と判定され、 修了証を発行できます。
        </p>
        <div className="flex flex-col gap-2.5">
          <CriterionToggle
            label="全レッスンの完了を必須にする"
            checked={form.requireAllLessons}
            onChange={(v) => setForm({ ...form, requireAllLessons: v })}
          />
          <CriterionToggle
            label="全小テストの合格を必須にする"
            checked={form.requireQuizPass}
            onChange={(v) => setForm({ ...form, requireQuizPass: v })}
          />
          <CriterionToggle
            label="全課題の pass を必須にする"
            checked={form.requireAssignmentPass}
            onChange={(v) => setForm({ ...form, requireAssignmentPass: v })}
          />
          <CriterionToggle
            label="基準達成時の修了証の自動発行を許可する"
            checked={form.autoIssueCertificate}
            onChange={(v) => setForm({ ...form, autoIssueCertificate: v })}
          />
        </div>
        <div className="mt-4 flex justify-end">
          <Button type="button" variant="primary" disabled={saving} onClick={() => void onSaveMeta()}>
            <Save size={14} />
            修了基準を保存
          </Button>
        </div>
      </section>

      <section className="bg-card border border-border rounded-md p-5">
        <h3 className="text-sm font-semibold mb-3">セクション / レッスン</h3>
        <SectionList course={data} tenantId={tenantId} onChange={refetch} />
      </section>
    </div>
  );
}

function CriterionToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2.5 text-[13px] cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded-sm border-border accent-brand"
      />
      <span>{label}</span>
    </label>
  );
}

interface FormState {
  title: string;
  slug: string;
  category: string;
  color: CourseColor;
  durationHours: string;
  instructorName: string;
  description: string;
  requireAllLessons: boolean;
  requireQuizPass: boolean;
  requireAssignmentPass: boolean;
  autoIssueCertificate: boolean;
}

function fromCourse(data: CourseWithChildren): FormState {
  return {
    title: data.course.title,
    slug: data.course.slug,
    category: data.course.category ?? "",
    color: data.course.color ?? "indigo",
    durationHours: data.course.duration_hours != null ? String(data.course.duration_hours) : "",
    // 列が未マイグレーションの環境では undefined → 空 (未設定) に倒す。
    instructorName: data.course.instructor_name ?? "",
    description: data.course.description ?? "",
    // 列が未マイグレーションの環境では undefined → 既定 true に倒す。
    requireAllLessons: data.course.require_all_lessons ?? true,
    requireQuizPass: data.course.require_quiz_pass ?? true,
    requireAssignmentPass: data.course.require_assignment_pass ?? true,
    autoIssueCertificate: data.course.auto_issue_certificate ?? true,
  };
}
