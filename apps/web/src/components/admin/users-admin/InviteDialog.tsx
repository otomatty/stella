/**
 * 招待ダイアログ (単体)。 email / 表示名 / ロールを指定して 1 名を招待する。
 *
 * Phase 3b で **招待と同時の教材割当は無くなった**。 受講者は入ったあと、 ホームの
 * プレースメントで自分の始点を選ぶ (割当プリセットの適用そのものが廃止)。
 */

import { useState } from "react";
import { toast } from "sonner";

import { Mail } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ASSIGNABLE_PROFILE_ROLES,
  isValidEmail,
  type AssignableProfileRole,
  type InviteUserInput,
} from "@falcon/shared/admin/types";
import { inviteUsers } from "@/lib/admin-users-api";

import { ROLE_LABEL } from "./shared";

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenantName: string;
  onInvited: () => Promise<void> | void;
}

export function InviteDialog({ open, onOpenChange, tenantName, onInvited }: InviteDialogProps) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<AssignableProfileRole>("student");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setEmail("");
    setDisplayName("");
    setRole("student");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      toast.error("メールアドレスを入力してください");
      return;
    }
    if (!isValidEmail(trimmed)) {
      toast.error("有効なメールアドレスを入力してください");
      return;
    }
    setSubmitting(true);
    try {
      const invites: InviteUserInput[] = [
        {
          email: trimmed,
          displayName: displayName.trim() || trimmed.split("@")[0] || trimmed,
          role,
        },
      ];
      const res = await inviteUsers(invites);
      const first = res.results[0];
      if (first?.ok) {
        toast.success(`${trimmed} を招待しました`);
        reset();
        onOpenChange(false);
        await onInvited();
      } else {
        toast.error(`招待失敗: ${first?.error ?? "unknown"}`);
      }
    } catch (err) {
      toast.error(`招待失敗: ${err instanceof Error ? err.message : "unknown"}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(calc(100vw-2rem),460px)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail size={16} />
            ユーザーを招待
          </DialogTitle>
          <DialogDescription>
            {tenantName} に招待メールを送ります。 受諾後、 指定したロールでログインできます。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4 px-6 py-2">
          <div>
            <Label htmlFor="inv-email">メールアドレス</Label>
            <Input
              id="inv-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="inv-name">表示名 (任意)</Label>
            <Input
              id="inv-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="例: 田中 翔太"
            />
          </div>
          <div>
            <Label htmlFor="inv-role">ロール</Label>
            <select
              id="inv-role"
              value={role}
              onChange={(e) => setRole(e.target.value as AssignableProfileRole)}
              className="h-10 w-full rounded-sm border border-input bg-card px-3 text-sm"
            >
              {ASSIGNABLE_PROFILE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter className="px-0 pb-2 border-t-0">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              キャンセル
            </Button>
            <Button type="submit" variant="accent" disabled={submitting}>
              {submitting ? "送信中…" : "招待を送る"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
