import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { type ReviewCommentTemplate, templateApplies } from "@stella/shared/review/review-desk";
import { ClipboardList, Plus, Trash } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createTemplate,
  deleteTemplate,
  fetchTemplates,
  updateTemplate,
} from "@/lib/review-desk-api";

interface CommentTemplatePickerProps {
  /** 提出の課題の講座とパターン。当てはまる定型コメントだけを出す。 */
  stageId: string | null | undefined;
  pattern: string | null | undefined;
  /** 選んだ定型コメントを本文に入れる (入れたあと講師が直して送る)。 */
  onInsert: (body: string) => void;
  /** 「今の文を保存」で定型コメントにする文。 */
  currentText: string;
}

/**
 * コメント集 (#34、07 §6.4 の 4)。課題のパターンごとのよくある違反と定型コメントを選び、
 * 本文に入れて直して送る。今書いた文を、この課題のパターンの定型コメントとして保存できる。
 */
export function CommentTemplatePicker({
  stageId,
  pattern,
  onInsert,
  currentText,
}: CommentTemplatePickerProps) {
  const [templates, setTemplates] = useState<ReviewCommentTemplate[] | null>(null);
  const [violation, setViolation] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      // サーバーは講座を渡したときだけ絞る。講座の無い提出 (旧形式) は全講座向けだけを出す。
      const task = { stageId: stageId ?? null, pattern: pattern ?? null };
      setTemplates(
        (await fetchTemplates({ stageId, pattern })).filter((t) => templateApplies(t, task)),
      );
    } catch {
      setTemplates([]);
    }
  }, [stageId, pattern]);
  useEffect(() => {
    void load();
  }, [load]);

  const saveCurrent = async () => {
    if (!violation.trim() || !currentText.trim()) return;
    setSaving(true);
    try {
      await createTemplate({
        stageId: stageId ?? null,
        pattern: pattern ?? null,
        violation: violation.trim(),
        body: currentText.trim(),
      });
      setViolation("");
      toast.success("定型コメントに保存しました");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "定型コメントを保存できませんでした");
    } finally {
      setSaving(false);
    }
  };

  const overwrite = async (template: ReviewCommentTemplate) => {
    if (!currentText.trim()) return;
    try {
      await updateTemplate(template.id, { body: currentText.trim() });
      toast.success("定型コメントを今の文で上書きしました");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "定型コメントを直せませんでした");
    }
  };

  const remove = async (template: ReviewCommentTemplate) => {
    try {
      await deleteTemplate(template.id);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "定型コメントを消せませんでした");
    }
  };

  return (
    <section className="mb-4 text-[12.5px]">
      <h3 className="text-[11.5px] font-semibold text-ink-3 mb-1.5 flex items-center gap-1">
        <ClipboardList size={12} />
        コメント集{pattern ? ` (${pattern})` : ""}
      </h3>
      {templates === null ? (
        <p className="text-ink-3">読み込んでいます…</p>
      ) : templates.length === 0 ? (
        <p className="text-ink-3">この課題のパターンの定型コメントはまだありません。</p>
      ) : (
        <ul className="mb-2">
          {templates.map((t) => (
            <li key={t.id} className="py-1.5 border-b border-border last:border-b-0">
              <div className="flex items-center gap-1.5">
                <span className="font-medium flex-1 min-w-0 truncate" title={t.violation}>
                  {t.violation}
                </span>
                {t.ruleId ? (
                  <span className="font-mono text-[11px] text-ink-3">{t.ruleId}</span>
                ) : null}
                <Button size="sm" type="button" onClick={() => onInsert(t.body)}>
                  使う
                </Button>
                <Button
                  size="sm"
                  type="button"
                  variant="ghost"
                  disabled={!currentText.trim()}
                  title="今書いている文で、この定型コメントを上書きします"
                  onClick={() => void overwrite(t)}
                >
                  上書き
                </Button>
                <Button
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                  aria-label={`定型コメント「${t.violation}」を消す`}
                  onClick={() => void remove(t)}
                >
                  <Trash size={12} />
                </Button>
              </div>
              <p className="text-ink-3 whitespace-pre-wrap line-clamp-2">{t.body}</p>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-1.5">
        <Input
          value={violation}
          onChange={(e) => setViolation(e.target.value)}
          placeholder="よくある違反 (例: 見出しを飾りに使う)"
          aria-label="定型コメントのよくある違反"
          className="h-7 text-[12px]"
        />
        <Button
          size="sm"
          type="button"
          disabled={saving || !violation.trim() || !currentText.trim()}
          onClick={() => void saveCurrent()}
        >
          <Plus size={11} />
          今の文を保存
        </Button>
      </div>
    </section>
  );
}
