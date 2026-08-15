/**
 * CSV 一括招待ダイアログ。 `email, 表示名, ロール` 形式 (1 行 1 名) を
 * ファイル選択または貼り付けで受け取り、 一括招待する。
 */

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Upload } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { parseInviteCsv } from "@falcon/shared/admin/parse-invite-csv";
import { inviteUsers } from "@/lib/admin-users-api";

interface CsvInviteDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenantName: string;
  onInvited: () => Promise<void> | void;
}

export function CsvInviteDialog({
  open,
  onOpenChange,
  tenantName,
  onInvited,
}: CsvInviteDialogProps) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => parseInviteCsv(text), [text]);

  const onPickFile = async (file: File | undefined) => {
    if (!file) return;
    const content = await file.text();
    setText(content);
  };

  const submit = async () => {
    if (parsed.rows.length === 0) {
      toast.error("有効な行がありません");
      return;
    }
    setSubmitting(true);
    try {
      const res = await inviteUsers(parsed.rows);
      const ok = res.results.filter((r) => r.ok).length;
      const failed = res.results.filter((r) => !r.ok);
      if (ok > 0) {
        toast.success(`${ok} 件を招待しました`);
      }
      if (failed.length > 0) {
        toast.error(
          `${failed.length} 件失敗: ${failed
            .slice(0, 3)
            .map((f) => `${f.email} (${f.error})`)
            .join(", ")}${failed.length > 3 ? " …" : ""}`,
        );
      }
      await onInvited();
      if (failed.length === 0) {
        setText("");
        onOpenChange(false);
      }
    } catch (err) {
      toast.error(`一括招待失敗: ${err instanceof Error ? err.message : "unknown"}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(calc(100vw-2rem),560px)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload size={16} />
            CSV一括招待
          </DialogTitle>
          <DialogDescription>
            {tenantName} へ一括招待します。 形式: <code>email, 表示名, ロール</code> (1 行 1 名 /
            ヘッダ行は自動スキップ)。 ロールは 受講者 / 講師 / 管理者。
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 px-6 py-2">
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv,text/plain"
              className="hidden"
              onChange={(e) => void onPickFile(e.target.files?.[0])}
            />
            <Button type="button" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload size={13} />
              CSVファイルを選択
            </Button>
            <span className="text-[11.5px] text-ink-3">または下に貼り付け</span>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              "email,表示名,ロール\nhanako@example.com,山田 花子,講師\ntaro@example.com,田中 太郎,受講者"
            }
            className="h-40 w-full rounded-sm border border-input bg-card px-3 py-2 text-[12.5px] font-mono resize-y outline-none focus:border-brand"
          />
          <div className="text-[11.5px] text-ink-3 flex items-center gap-3">
            <span className="text-success">有効 {parsed.rows.length} 件</span>
            {parsed.errors.length > 0 ? (
              <span className="text-destructive">エラー {parsed.errors.length} 件</span>
            ) : null}
          </div>
          {parsed.errors.length > 0 ? (
            <div className="max-h-24 overflow-y-auto rounded-md border border-destructive/40 bg-danger-soft px-3 py-2 text-[11px] text-destructive">
              {parsed.errors.map((e) => (
                <div key={e}>{e}</div>
              ))}
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button
            type="button"
            variant="accent"
            disabled={submitting || parsed.rows.length === 0}
            onClick={() => void submit()}
          >
            {submitting ? "送信中…" : `${parsed.rows.length} 件を招待`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
