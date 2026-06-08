/**
 * 新しい質問の投稿フォーム (Issue #24)。
 *
 * タイトル (任意) + 本文 (必須) を受け取り、 親が渡す onSubmit に委譲する。
 * `children` で本文の上に追加フィールド (コース選択など) を差し込める。
 */

import { useState, type ReactNode } from 'react';
import { Plus, Loader2 } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface QuestionComposerProps {
  onSubmit: (input: { title: string; body: string }) => Promise<void>;
  /** 送信を抑止する (前提条件が未充足のとき)。 */
  disabled?: boolean;
  /** 本文欄の上に差し込む追加フィールド (例: コース選択)。 */
  children?: ReactNode;
  bodyPlaceholder?: string;
  submitLabel?: string;
}

/** タイトル + 本文を入力し、 親の onSubmit に投稿を委譲するフォーム。 */
export function QuestionComposer({
  onSubmit,
  disabled = false,
  children,
  bodyPlaceholder = '質問の内容を具体的に記入してください…',
  submitLabel = '質問を投稿',
}: QuestionComposerProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = !disabled && !submitting && body.trim().length > 0;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onSubmit({ title: title.trim(), body: body.trim() });
      // 成功時のみ入力をクリアする (失敗時は再入力を避けるため保持)。
      setTitle('');
      setBody('');
    } catch {
      // onSubmit 側でトースト等の通知済み。 ここでは入力を保持するだけ。
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-2.5 pt-5">
        {children}
        <Input
          placeholder="タイトル (任意)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={disabled || submitting}
        />
        <Textarea
          placeholder={bodyPlaceholder}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={disabled || submitting}
          className="min-h-[88px] text-[13px]"
        />
        <div className="flex items-center">
          <span className="text-[11.5px] text-ink-3">
            投稿は同じテナントの受講者・講師に表示されます
          </span>
          <div className="flex-1" />
          <Button variant="accent" disabled={!canSubmit} onClick={() => void submit()}>
            {submitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Plus size={14} />
            )}
            {submitLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
