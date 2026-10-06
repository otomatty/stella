/**
 * 教材の OS 別ブロック (`:::os windows` / `:::os macos`。07 §11) を OS のタブで出す。
 *
 * 既定のタブはプロフィールの設定 → 端末の推定 → Windows の順 (`resolvePreferredOs`)。
 * タブの切り替えは同じ画面のタブ全部にそろえて効かせ、設定は変えない。設定は
 * 「あなたの OS: Windows（変更）」の「変更」と設定画面から変える。
 *
 * 本文は呼び出し側の描画 (`LessonMarkdown` と同じ react-markdown) に任せる。生の HTML を
 * 通さない点も同じ。
 */

import { type ReactNode, useContext, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import {
  isOsName,
  OS_LABELS,
  OS_NAMES,
  type OsBlock,
  type OsName,
  orderedOsBlocks,
  pickOsBlock,
} from "@stella/shared/markdown/os-blocks";

import { AppShellContext } from "@/components/shell/app-shell-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  detectBrowserOs,
  getViewOsState,
  type OsSource,
  resolvePreferredOs,
  setViewOs,
  subscribeViewOs,
  updateMyOsPreference,
  viewOsFor,
} from "@/lib/os-preference";
import { cn } from "@/lib/utils";

export function OsTabs({
  blocks,
  renderMarkdown,
}: {
  blocks: readonly OsBlock[];
  renderMarkdown: (markdown: string) => ReactNode;
}) {
  const shell = useContext(AppShellContext);
  const detected = detectBrowserOs();
  const preferred = resolvePreferredOs(shell?.profile?.os_preference, detected);
  // タブで選んだ OS は、選んだ本人の画面でだけ使う (ログアウト後の別アカウントに持ち越さない)。
  const owner = shell?.profile?.id ?? null;
  const viewState = useSyncExternalStore(subscribeViewOs, getViewOsState, getViewOsState);
  const viewing = viewOsFor(viewState, owner);
  const ordered = orderedOsBlocks(blocks);
  const active = pickOsBlock(ordered, viewing ?? preferred.os)?.os;
  if (!active) return null;

  return (
    <div className="my-5 rounded-md border border-border px-4 pb-1">
      <Tabs value={active} onValueChange={(value) => isOsName(value) && setViewOs(owner, value)}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <TabsList aria-label="OS ごとの手順">
            {ordered.map((block) => (
              <TabsTrigger key={block.os} value={block.os}>
                {OS_LABELS[block.os]}
              </TabsTrigger>
            ))}
          </TabsList>
          <OsPreferenceNote
            os={preferred.os}
            source={preferred.source}
            detected={detected}
            owner={owner}
            canSave={!!shell?.backendEnabled && !!shell.profile}
            onSaved={shell?.onProfileUpdated}
          />
        </div>
        {ordered.map((block) => (
          <TabsContent key={block.os} value={block.os} className="mt-4">
            {renderMarkdown(block.markdown)}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

/** 「あなたの OS: Windows（変更）」。変更はその場で選び、プロフィールに保存する。 */
function OsPreferenceNote({
  os,
  source,
  detected,
  owner,
  canSave,
  onSaved,
}: {
  os: OsName;
  source: OsSource;
  detected: OsName | null;
  owner: string | null;
  canSave: boolean;
  onSaved?: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const choose = async (next: OsName | null) => {
    setEditing(false);
    // 設定を変えたら、覗いていたタブより新しい既定を優先する。
    setViewOs(owner, canSave ? null : next);
    if (!canSave) return;
    setSaving(true);
    try {
      await updateMyOsPreference(next);
      await onSaved?.();
      toast.success(
        next ? `${OS_LABELS[next]} の手順を表示します` : "この端末の OS に合わせて表示します",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "OS の設定を保存できませんでした");
    } finally {
      setSaving(false);
    }
  };

  const options: { value: OsName | null; label: string }[] = [
    {
      value: null,
      label: detected ? `自動 (この端末: ${OS_LABELS[detected]})` : "自動",
    },
    ...OS_NAMES.map((value) => ({ value, label: OS_LABELS[value] })),
  ];
  const current = source === "profile" ? os : null;

  // タブの行に並べ、選択肢は次の行に右寄せで出す (タブの位置を動かさない)。
  return (
    <>
      <div className="ml-auto flex items-center gap-x-1.5 py-1.5 text-[11.5px] text-ink-3">
        <span>
          あなたの OS:{" "}
          <span className="font-semibold text-ink-2">
            {source === "default" ? "未設定" : OS_LABELS[os]}
          </span>
        </span>
        <span>
          （
          <button
            type="button"
            className="text-sf-magenta underline-offset-2 hover:underline disabled:opacity-50"
            aria-expanded={editing}
            disabled={saving}
            onClick={() => setEditing((v) => !v)}
          >
            変更
          </button>
          ）
        </span>
      </div>
      {editing ? (
        <fieldset className="flex basis-full flex-wrap items-center justify-end gap-1.5 pt-1">
          <legend className="sr-only">教材で表示する OS</legend>
          {options.map((option) => (
            <button
              key={option.value ?? "auto"}
              type="button"
              aria-pressed={option.value === current}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[11.5px] transition-colors",
                option.value === current
                  ? "border-sf-magenta bg-sf-magenta-soft text-sf-magenta-ink"
                  : "border-border text-ink-2 hover:bg-sunken",
              )}
              onClick={() => void choose(option.value)}
            >
              {option.label}
            </button>
          ))}
        </fieldset>
      ) : null}
    </>
  );
}
