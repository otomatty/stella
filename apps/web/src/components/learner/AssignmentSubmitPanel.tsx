import { useState } from 'react';
import { toast } from 'sonner';
import { Send, CheckCircle, Loader2 } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { Course, Lesson } from '@/data/types';
import {
  createSubmission,
  createSubmissionAsync,
} from '@/lib/submissions-store';
import { isBackendConfigured } from "@/lib/backend";
import type { Tenant } from '@/data/types';

interface AssignmentSubmitPanelProps {
  tenantId: Tenant['id'];
  course: Course;
  lesson: Lesson;
  sectionTitle?: string;
  studentName: string;
  studentInitials: string;
  onSubmitted?: () => void;
}

export function AssignmentSubmitPanel({
  tenantId,
  course,
  lesson,
  sectionTitle,
  studentName,
  studentInitials,
  onSubmitted,
}: AssignmentSubmitPanelProps) {
  const [code, setCode] = useState(
    `// ${lesson.title}\n// 提出用コードをここに貼り付けてください\n\n`,
  );
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmed = code.trim();
    if (trimmed.length < 10) {
      toast.error('提出コードを入力してください');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        studentName,
        studentInitials,
        avatarTone: 'c1' as const,
        courseTitle: course.title,
        sectionTitle,
        assignmentTitle: lesson.title,
        lessonId: lesson.id,
        assignmentId: lesson.assignmentId,
        codeLines: code.split('\n'),
        priority: 'normal' as const,
      };
      const created = isBackendConfigured()
        ? await createSubmissionAsync(tenantId, payload)
        : createSubmission(tenantId, payload);
      if (!created) {
        toast.error(
          isBackendConfigured()
            ? '提出の保存に失敗しました。ログイン状態とネットワークを確認してください。'
            : '提出の保存に失敗しました。ストレージ容量を確認してください。',
        );
        return;
      }
      toast.success('講師に提出しました。添削結果は Q&A または通知でお知らせします。');
      onSubmitted?.();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="prose-lms">
      <h2>課題提出</h2>
      <p>
        完成したコード（またはレポート）を提出してください。 講師が AI 下書きを参考に添削し、
        合格 / 再提出 / 不合格のいずれかで返却します。
      </p>
      <Label className="mt-4 block">提出コード</Label>
      <Textarea
        className="font-mono text-[12.5px] min-h-[280px] mb-4"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        spellCheck={false}
      />
      <div className="flex gap-2.5 items-center pt-4 border-t border-border">
        <Button variant="accent" onClick={handleSubmit} disabled={submitting}>
          {submitting ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Send size={14} />
          )}
          講師に提出
        </Button>
        <span className="text-[11.5px] text-ink-3 flex items-center gap-1">
          <CheckCircle size={12} />
          提出後は「添削待ち」キューに表示されます
        </span>
      </div>
    </div>
  );
}
