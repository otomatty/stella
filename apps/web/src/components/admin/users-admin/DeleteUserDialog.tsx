/**
 * 受講者の削除。メールアドレスの入力が一致するまで「削除する」は押せない。
 * 大文字小文字と前後の空白は無視する。サーバーが受講者かどうかとメールを改めて確かめる。
 */

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteUser, type AdminProfileRow } from "@/lib/admin-users-api";

const DELETE_USER_DESCRIPTION =
  "提出・AI のレビュー・学習の記録・本棚の本・ログインの情報を消します。元に戻せません。" +
  "提出のファイルは 24 時間以内に、本棚のファイルは 10 分ほどで消えます。";

interface DeleteUserDialogProps {
  profile: AdminProfileRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: (userId: string) => Promise<void> | void;
}

/** 一覧に出ているメールと、入力をサーバーと同じ規則で比べる。空のメールは一致させない。 */
function emailsMatch(input: string, email: string | null): boolean {
  const expected = (email ?? "").trim().toLowerCase();
  if (!expected) return false;
  return input.trim().toLowerCase() === expected;
}

export function DeleteUserDialog({
  profile,
  open,
  onOpenChange,
  onDeleted,
}: DeleteUserDialogProps) {
  const [confirmEmail, setConfirmEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const matched = emailsMatch(confirmEmail, profile?.email ?? null);

  const close = () => {
    setConfirmEmail("");
    onOpenChange(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (submitting && !next) return;
    if (!next) {
      close();
      return;
    }
    onOpenChange(next);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || submitting || !emailsMatch(confirmEmail, profile.email)) return;
    setSubmitting(true);
    try {
      const deleted = await deleteUser(profile.id, confirmEmail);
      const summary = `提出 ${deleted.submissions} 件・本 ${deleted.library_books} 冊`;
      toast.success(`${profile.display_name} を削除しました (${summary})`);
      close();
      await onDeleted(profile.id);
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : "削除できませんでした";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open && profile !== null} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[min(calc(100vw-2rem),460px)]">
        {profile ? (
          <>
            <DialogHeader>
              <DialogTitle>{profile.display_name} を削除しますか？</DialogTitle>
              <DialogDescription>{DELETE_USER_DESCRIPTION}</DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4 px-6 py-2">
              <div>
                <Label htmlFor="delete-user-email">
                  確かめるため、メールアドレス ({profile.email ?? "—"}) を入力してください
                </Label>
                <Input
                  id="delete-user-email"
                  type="text"
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  inputMode="email"
                  autoFocus
                  disabled={submitting}
                />
              </div>
              <DialogFooter className="px-0 pb-2 border-t-0">
                <Button type="button" variant="ghost" onClick={close} disabled={submitting}>
                  キャンセル
                </Button>
                <Button type="submit" variant="destructive" disabled={submitting || !matched}>
                  {submitting ? "削除しています…" : "削除する"}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
