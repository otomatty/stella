import { useEffect, useId, useState } from "react";
import type { IntegrationGroup } from "@stella/shared/integrations/types";
import { NativeSelect } from "@/components/ui/native-select";
import { apiFetch } from "@/lib/api-client";
import { isBackendConfigured } from "@/lib/backend";

export function IntegrationGroupFilter({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
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
  if (failed) return <span role="status">グループの取得に失敗しました</span>;
  if (!groups.length) return null;
  return (
    <label htmlFor={groupSelectId} className="inline-flex items-center gap-2 text-sm">
      グループ
      <NativeSelect
        id={groupSelectId}
        aria-label="グループで絞り込む"
        size="sm"
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
