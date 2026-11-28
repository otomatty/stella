import { useId, useRef, useState } from "react";
import { toast } from "sonner";
import { Notice } from "@/components/common/Notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { GroupRequest, GroupSummary } from "@/lib/admin-groups-api";

const SHARE_DESCRIPTION =
  "オンにすると、このグループのメンバー同士で、表示名 (呼び名があれば呼び名)・修了したステージ・進捗の割合が見えます。";
const SHARE_SETTINGS = [
  {
    field: "shareProgress",
    title: "仲間に進捗を公開する",
    label: "進捗の公開",
    description: SHARE_DESCRIPTION,
    confirmTitle: "仲間に進捗を公開しますか？",
  },
  {
    field: "shareActivity",
    title: "活動の公開",
    label: "活動の公開",
    description: "オンにすると、同じグループのメンバーどうしでタイムラインとスタンプを見られます。",
    confirmTitle: "仲間に活動を公開しますか？",
    confirmDescription:
      "メンバーの節目 (ステージの開始・課題の合格・修了) とスタンプを、同じグループのメンバーどうしで見られるようにします。選考用のグループではオフのままにしてください。",
  },
] as const;

type ShareField = (typeof SHARE_SETTINGS)[number]["field"];
type GroupChanges = Partial<Pick<GroupSummary, "name" | ShareField>>;

export function GroupOverview({
  group,
  request,
  onChange,
  onDelete,
}: {
  group: GroupSummary;
  request: GroupRequest;
  onChange: (changes: GroupChanges) => void;
  onDelete: () => Promise<void>;
}) {
  const nameId = useId();
  const shareId = useId();
  const confirmId = useId();
  const onRadioRefs = useRef<Partial<Record<ShareField, HTMLButtonElement | null>>>({});
  const [name, setName] = useState(group.name);
  const [confirmName, setConfirmName] = useState("");
  const [dialog, setDialog] = useState<ShareField | "delete" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>, fallback: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await action();
      setDialog(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : fallback);
    } finally {
      setBusy(false);
    }
  }

  function save(changes: GroupChanges, success: string) {
    return run(async () => {
      await request("", { method: "PATCH", body: changes });
      onChange(changes);
      if (changes.name !== undefined) setName(changes.name);
      toast.success(success);
    }, "変更を保存できませんでした");
  }

  function openDialog(kind: ShareField | "delete") {
    setError(null);
    setConfirmName("");
    setDialog(kind);
  }

  function closeDialog() {
    if (busy) return;
    setDialog(null);
    setError(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>概要</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {group.kind === "admin" && (
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (name.trim() && name.trim() !== group.name)
                void save({ name: name.trim() }, "グループ名を変更しました");
            }}
          >
            <div className="w-full min-w-0 sm:max-w-sm">
              <Label htmlFor={nameId}>グループ名</Label>
              <Input
                id={nameId}
                className="min-h-11"
                required
                maxLength={200}
                value={name}
                disabled={busy}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <Button
              className="min-h-11"
              type="submit"
              disabled={busy || !name.trim() || name.trim() === group.name}
            >
              名前を保存
            </Button>
          </form>
        )}
        {SHARE_SETTINGS.map((setting) => {
          const { field, title, label, description, confirmTitle } = setting;
          const id = `${shareId}-${field}`;
          return (
            <div key={field}>
              <p id={`${id}-title`} className="text-sm font-semibold">
                {title}
              </p>
              <p id={`${id}-description`} className="mt-1 text-sm text-ink-2">
                {description}
              </p>
              <RadioGroup
                className="mt-3"
                value={group[field] ? "on" : "off"}
                disabled={busy}
                aria-labelledby={`${id}-title`}
                aria-describedby={`${id}-description`}
                onValueChange={(value) => {
                  if (value === "on" && !group[field]) openDialog(field);
                  if (value === "off" && group[field])
                    void save({ [field]: false }, `${label}をオフにしました`);
                }}
              >
                <div className="flex min-h-11 items-center gap-2">
                  <RadioGroupItem value="off" id={`${id}-off`} />
                  <Label htmlFor={`${id}-off`} className="mb-0 text-sm font-normal">
                    オフ
                  </Label>
                </div>
                <div className="flex min-h-11 items-center gap-2">
                  <RadioGroupItem
                    ref={(node) => {
                      onRadioRefs.current[field] = node;
                    }}
                    value="on"
                    id={`${id}-on`}
                  />
                  <Label htmlFor={`${id}-on`} className="mb-0 text-sm font-normal">
                    オン
                  </Label>
                </div>
              </RadioGroup>
              <Dialog
                open={dialog === field}
                onOpenChange={(open) => {
                  if (!open) closeDialog();
                }}
              >
                <DialogContent
                  className="max-w-md overflow-y-auto"
                  onCloseAutoFocus={(event) => {
                    event.preventDefault();
                    onRadioRefs.current[field]?.focus();
                  }}
                >
                  <DialogHeader>
                    <DialogTitle>{confirmTitle}</DialogTitle>
                    <DialogDescription>
                      {"confirmDescription" in setting ? setting.confirmDescription : description}
                    </DialogDescription>
                  </DialogHeader>
                  {error && (
                    <Notice role="alert" className="mx-6">
                      {error}
                    </Notice>
                  )}
                  <DialogFooter>
                    <Button
                      type="button"
                      className="min-h-11"
                      variant="outline"
                      disabled={busy}
                      onClick={closeDialog}
                    >
                      キャンセル
                    </Button>
                    <Button
                      type="button"
                      className="min-h-11"
                      variant="primary"
                      disabled={busy}
                      onClick={() => void save({ [field]: true }, `${label}をオンにしました`)}
                    >
                      公開する
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          );
        })}
        {group.kind === "admin" && (
          <Dialog
            open={dialog === "delete"}
            onOpenChange={(open) => {
              if (open) openDialog("delete");
              else closeDialog();
            }}
          >
            <div className="border-t border-border pt-5">
              <DialogTrigger asChild>
                <Button type="button" className="min-h-11" variant="destructive" disabled={busy}>
                  グループを削除
                </Button>
              </DialogTrigger>
            </div>
            <DialogContent className="max-w-md overflow-y-auto">
              <DialogHeader>
                <DialogTitle>グループを削除しますか？</DialogTitle>
                <DialogDescription className="break-all">
                  「{group.name}
                  」を削除すると、このグループによるステージの割り当ても解除されます。削除は元に戻せません。
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (confirmName === group.name)
                    void run(onDelete, "グループを削除できませんでした");
                }}
              >
                <div className="space-y-3 px-6 pb-4">
                  <Label htmlFor={confirmId}>確認のため、グループ名を入力してください</Label>
                  <Input
                    id={confirmId}
                    className="min-h-11"
                    value={confirmName}
                    autoComplete="off"
                    disabled={busy}
                    onChange={(event) => setConfirmName(event.target.value)}
                  />
                  {error && <Notice role="alert">{error}</Notice>}
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    className="min-h-11"
                    variant="outline"
                    disabled={busy}
                    onClick={closeDialog}
                  >
                    キャンセル
                  </Button>
                  <Button
                    type="submit"
                    className="min-h-11"
                    variant="destructive"
                    disabled={busy || confirmName !== group.name}
                  >
                    削除する
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
        {error && dialog === null && <Notice role="alert">{error}</Notice>}
      </CardContent>
    </Card>
  );
}
