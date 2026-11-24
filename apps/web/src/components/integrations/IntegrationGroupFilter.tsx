import { useEffect, useId, useState } from "react";
import type { IntegrationGroup } from "@stella/shared/integrations/types";
import { NativeSelect } from "@/components/ui/native-select";
import { apiFetch } from "@/lib/api-client";
import { isBackendConfigured } from "@/lib/backend";
import { cn } from "@/lib/utils";

export function IntegrationGroupFilter({
  value,
  onChange,
  disabled = false,
  className,
  selectClassName,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  selectClassName?: string;
}) {
  const groupSelectId = useId();
  const [groups, setGroups] = useState<IntegrationGroup[]>([]);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!isBackendConfigured()) return;
    const ac = new AbortController();
    void apiFetch<{ groups: IntegrationGroup[] }>("/api/admin/integration-groups", {
      signal: ac.signal,
    })
      .then((data) => setGroups(data.groups))
      .catch(() => {
        if (!ac.signal.aborted) setFailed(true);
      });
    return () => ac.abort();
  }, []);
  if (failed) {
    return (
      <span role="status" className={className}>
        グループの取得に失敗しました
      </span>
    );
  }
  if (!groups.length) return null;
  return (
    <label
      htmlFor={groupSelectId}
      className={cn("inline-flex items-center gap-2 text-sm", className)}
    >
      グループ
      <NativeSelect
        id={groupSelectId}
        aria-label="グループで絞り込む"
        size="sm"
        className={selectClassName}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">すべて</option>
        {groups.map((group) => (
          <option key={group.id} value={group.id}>
            {group.name} ({group.key})
          </option>
        ))}
      </NativeSelect>
    </label>
  );
}
