/**
 * `/admin/orgs` — 組織マスタ (Issue #29)。
 *
 * B2B 顧客企業・学校 (= tenant) を一覧・作成・編集する。 所属ユーザー数は実データ。
 * 作成 / 編集はテナント横断の特権操作のため、 admin 認可を課す管理 API (Neon / Hono) で行う。
 *
 * バックエンド (Neon Auth + API) 未設定時 (dev fixtures フロー): 操作不可の案内のみ表示する。
 */

import { useState } from "react";
import { toast } from "sonner";

import { Building, Edit, Plus, Users } from "@/lib/icons";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { SkeletonRows } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import type { OrganizationRow } from "@falcon/shared/admin/types";
import { isValidOrgId } from "@falcon/shared/admin/types";
import { useOrganizations } from "@/hooks/useOrganizations";
import { upsertOrganization } from "@/lib/organizations-api";

interface Props {
  backendEnabled: boolean;
}

interface FormState {
  id: string;
  name: string;
  subtitle: string;
  contactName: string;
  contactEmail: string;
  planSeats: string;
  contractStart: string;
  contractEnd: string;
  active: boolean;
}

const EMPTY_FORM: FormState = {
  id: "",
  name: "",
  subtitle: "",
  contactName: "",
  contactEmail: "",
  planSeats: "",
  contractStart: "",
  contractEnd: "",
  active: true,
};

function formFromOrg(o: OrganizationRow): FormState {
  return {
    id: o.id,
    name: o.name,
    subtitle: o.subtitle ?? "",
    contactName: o.contact_name ?? "",
    contactEmail: o.contact_email ?? "",
    planSeats: o.plan_seats != null ? String(o.plan_seats) : "",
    contractStart: o.contract_start ?? "",
    contractEnd: o.contract_end ?? "",
    active: o.active,
  };
}

export function AdminOrganizationsPage({ backendEnabled }: Props) {
  if (!backendEnabled) {
    return <OrgsDemoNotice />;
  }
  return <OrgsLive />;
}

function OrgsLive() {
  const { organizations, loading, error, refetch } = useOrganizations(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<OrganizationRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (o: OrganizationRow) => {
    setEditing(o);
    setForm(formFromOrg(o));
    setDialogOpen(true);
  };

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const onSubmit = async () => {
    if (!editing && !isValidOrgId(form.id.trim().toLowerCase())) {
      toast.error("組織IDは英小文字・数字・ハイフン (2〜32文字) で指定してください");
      return;
    }
    if (!form.name.trim()) {
      toast.error("組織名は必須です");
      return;
    }
    setSaving(true);
    try {
      await upsertOrganization({
        id: form.id.trim().toLowerCase(),
        name: form.name.trim(),
        subtitle: form.subtitle.trim() || null,
        contactName: form.contactName.trim() || null,
        contactEmail: form.contactEmail.trim() || null,
        planSeats: form.planSeats.trim() === "" ? null : Number(form.planSeats),
        contractStart: form.contractStart || null,
        contractEnd: form.contractEnd || null,
        active: form.active,
        expectCreate: !editing,
      });
      toast.success(editing ? "組織を更新しました" : "組織を作成しました");
      setDialogOpen(false);
      await refetch();
    } catch (err) {
      toast.error(
        `保存に失敗しました: ${err instanceof Error ? err.message : "unknown"}`,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="組織マスタ"
        sub="顧客企業・学校の登録管理 · 契約 / 席数 / 所属ユーザー数"
        actions={
          <Button variant="accent" onClick={openCreate}>
            <Plus size={14} />
            新規組織
          </Button>
        }
      />

      {error ? (
        <div className="mb-4 rounded-md border border-destructive bg-danger-soft px-3 py-2 text-[12.5px] text-destructive">
          組織一覧の取得に失敗しました: {error}
        </div>
      ) : null}

      <Card className="overflow-hidden">
        {loading && organizations.length === 0 ? (
          <SkeletonRows rows={4} className="p-4" />
        ) : organizations.length === 0 ? (
          <div className="py-10 text-center text-sm text-ink-3">
            組織がまだありません。 「新規組織」 から登録してください。
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>組織</TableHead>
                <TableHead>担当者</TableHead>
                <TableHead>所属 / 席数</TableHead>
                <TableHead>契約期間</TableHead>
                <TableHead>状態</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.map((o) => {
                const overSeats =
                  o.plan_seats != null && o.member_count > o.plan_seats;
                return (
                  <TableRow key={o.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-md bg-sunken grid place-items-center text-ink-3">
                          <Building size={15} />
                        </div>
                        <div>
                          <div className="font-medium">{o.name}</div>
                          <div className="text-[11.5px] text-ink-3 font-mono">
                            {o.id}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {o.contact_name || o.contact_email ? (
                        <div className="text-[12.5px]">
                          <div>{o.contact_name ?? "—"}</div>
                          <div className="text-ink-3">{o.contact_email ?? ""}</div>
                        </div>
                      ) : (
                        <span className="text-ink-4 text-[12.5px]">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-[12.5px] tabular-nums">
                        <Users size={13} className="text-ink-4" />
                        <span className={overSeats ? "text-destructive font-semibold" : ""}>
                          {o.member_count}
                        </span>
                        <span className="text-ink-3">
                          / {o.plan_seats != null ? o.plan_seats : "∞"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-[12.5px] text-ink-3 whitespace-nowrap">
                      {o.contract_start || o.contract_end
                        ? `${o.contract_start ?? "—"} 〜 ${o.contract_end ?? "—"}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {o.active ? (
                        <Badge variant="success">契約中</Badge>
                      ) : (
                        <Badge>停止</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(o)}>
                          <Edit size={13} />
                          編集
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[min(calc(100vw-2rem),560px)]">
          <DialogHeader>
            <DialogTitle>{editing ? "組織を編集" : "新規組織を作成"}</DialogTitle>
          </DialogHeader>

          <div className="px-6 py-2 grid gap-3.5">
            <Field label="組織ID" hint={editing ? "作成後は変更できません" : "英小文字・数字・ハイフン"}>
              <Input
                value={form.id}
                disabled={Boolean(editing)}
                placeholder="acme-corp"
                onChange={(e) => set("id", e.target.value)}
              />
            </Field>
            <Field label="組織名">
              <Input
                value={form.name}
                placeholder="株式会社ACME"
                onChange={(e) => set("name", e.target.value)}
              />
            </Field>
            <Field label="サブタイトル (任意)">
              <Input
                value={form.subtitle}
                placeholder="SES / 新人研修"
                onChange={(e) => set("subtitle", e.target.value)}
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Field label="担当者名 (任意)">
                <Input
                  value={form.contactName}
                  onChange={(e) => set("contactName", e.target.value)}
                />
              </Field>
              <Field label="担当者メール (任意)">
                <Input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => set("contactEmail", e.target.value)}
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <Field label="席数 (任意)">
                <Input
                  type="number"
                  min={0}
                  value={form.planSeats}
                  placeholder="無制限"
                  onChange={(e) => set("planSeats", e.target.value)}
                />
              </Field>
              <Field label="契約開始 (任意)">
                <Input
                  type="date"
                  value={form.contractStart}
                  onChange={(e) => set("contractStart", e.target.value)}
                />
              </Field>
              <Field label="契約終了 (任意)">
                <Input
                  type="date"
                  value={form.contractEnd}
                  onChange={(e) => set("contractEnd", e.target.value)}
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-[12.5px] cursor-pointer mt-1">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => set("active", e.target.checked)}
              />
              契約中 (有効)
            </label>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={saving}>
              キャンセル
            </Button>
            <Button variant="accent" onClick={() => void onSubmit()} disabled={saving}>
              {saving ? "保存中…" : editing ? "更新" : "作成"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[12.5px]">
        {label}
        {hint ? <span className="ml-2 text-ink-4 font-normal">{hint}</span> : null}
      </Label>
      {children}
    </div>
  );
}

function OrgsDemoNotice() {
  return (
    <>
      <PageHeader title="組織マスタ" sub="顧客企業・学校の登録管理" />
      <div className="rounded-md border border-border bg-sunken px-3 py-2 text-[12.5px] text-ink-3">
        バックエンド未設定のため組織マスタは利用できません。 組織の登録・編集を行うには
        <code className="mx-1">VITE_SERVER_URL</code> と API サーバ
        <code className="mx-1">VITE_SERVER_URL</code> を設定してください。
      </div>
    </>
  );
}
