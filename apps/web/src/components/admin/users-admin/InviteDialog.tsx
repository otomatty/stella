/**
 * 招待ダイアログ (単体)。 email / 表示名 / ロールを指定して 1 名を招待する。
 *
 * 割当プリセットを選ぶと、 招待が通った直後にその教材をまとめて割り当てる
 * (「入社 → 招待 → 受講登録」 を 1 回の操作にまとめる)。
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
import { todayDateKey } from "@/lib/date-keys";
import type { EnrollmentPresetWithItems } from "@falcon/shared/enrollment/preset";

import { ROLE_LABEL } from "./shared";
import {
  InvitePresetFields,
  type InvitePresetState,
  applyPresetToInvited,
} from "./InvitePresetFields";

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenantName: string;
  /** 招待と同時に割り当てられるプリセット。 空配列なら選択欄自体を出さない。 */
  presets: EnrollmentPresetWithItems[];
  onInvited: () => Promise<void> | void;
}

export function InviteDialog({
  open,
  onOpenChange,
  tenantName,
  presets,
  onInvited,
}: InviteDialogProps) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<AssignableProfileRole>("student");
  const [preset, setPreset] = useState<InvitePresetState>({
    presetId: "",
    baseDate: todayDateKey(),
  });
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setEmail("");
    setDisplayName("");
    setRole("student");
    setPreset({ presetId: "", baseDate: todayDateKey() });
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
        // 招待は成功しているので、 割当が失敗しても招待自体は巻き戻さない (警告に留める)。
        const selected = presets.find((p) => p.id === preset.presetId);
        if (selected && first.userId) {
          try {
            const applied = await applyPresetToInvited(selected, preset.baseDate, [first.userId]);
            if (applied.ok) toast.success(applied.message);
            else toast.error(applied.message);
          } catch (err) {
            toast.error(
              `招待は成功しましたが教材の割当に失敗しました: ${err instanceof Error ? err.message : "unknown"}`,
            );
          }
        }
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
          <InvitePresetFields
            presets={presets}
            value={preset}
            onChange={setPreset}
            disabled={submitting}
            idPrefix="inv"
          />
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
