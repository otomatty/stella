import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SkeletonRows } from "@/components/ui/skeleton";
import { Chip } from "@/components/ui/chip";
import {
  listStageGrants,
  saveStageGrants,
  type StageGrantLearnerRow,
  type StageGrantStageRow,
} from "@/lib/stage-grants-api";

export function StageGrantsPage({ backendEnabled }: { backendEnabled: boolean }) {
  const [stages, setStages] = useState<StageGrantStageRow[]>([]);
  const [learners, setLearners] = useState<StageGrantLearnerRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(backendEnabled);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!backendEnabled) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listStageGrants();
      setStages(data.stages);
      setLearners(data.learners);
      setDrafts(Object.fromEntries(data.stages.map((s) => [s.id, [...s.profile_ids]])));
    } catch (e) {
      setError(e instanceof Error ? e.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [backendEnabled]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleLearner = (stageId: string, profileId: string) => {
    setDrafts((prev) => {
      const current = prev[stageId] ?? [];
      const next = current.includes(profileId)
        ? current.filter((id) => id !== profileId)
        : [...current, profileId];
      return { ...prev, [stageId]: next };
    });
  };

  const save = async (stage: StageGrantStageRow) => {
    setSavingId(stage.id);
    try {
      const profileIds = drafts[stage.id] ?? [];
      await saveStageGrants(stage.id, profileIds);
      setStages((rows) =>
        rows.map((row) => (row.id === stage.id ? { ...row, profile_ids: profileIds } : row)),
      );
      toast.success(`「${stage.title}」の割当を保存しました`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="専用教材"
        sub="Git 正本で audience: granted とした講座を、選んだ受講者のスキルツリーにだけ出します。教材本文はリポジトリで編集し、ここでは割当だけ行います"
      />
      {!backendEnabled ? (
        <Card className="p-12 text-center text-sm text-ink-3">
          デモモードでは専用教材の割当を編集できません。
        </Card>
      ) : loading ? (
        <Card className="p-6">
          <SkeletonRows rows={4} />
        </Card>
      ) : error ? (
        <Card className="p-12 text-center text-sm text-destructive">
          一覧の取得に失敗しました: {error}
        </Card>
      ) : stages.length === 0 ? (
        <Card className="p-12 text-center text-sm text-ink-3">
          audience: granted の講座がまだありません。 packages/content の course.json に audience
          と親 (prerequisites) を書いて seed してください。
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {stages.map((stage) => (
            <Card key={stage.id} className="p-4 sm:p-5">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-[15px] font-semibold text-ink">{stage.title}</h2>
                  <p className="text-[12px] text-ink-4">
                    {stage.slug}
                    {stage.category ? ` · ${stage.category}` : ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  disabled={savingId === stage.id}
                  onClick={() => void save(stage)}
                >
                  {savingId === stage.id ? "保存中…" : "保存"}
                </Button>
              </div>
              <p className="mb-2 text-[12px] text-ink-3">割り当てる受講者</p>
              <div className="flex flex-wrap gap-2">
                {learners.map((learner) => {
                  const selected = (drafts[stage.id] ?? []).includes(learner.id);
                  const label = learner.selectable
                    ? learner.display_name
                    : `${learner.display_name}（無効）`;
                  return (
                    <Chip
                      key={learner.id}
                      active={selected}
                      disabled={savingId === stage.id}
                      ariaLabel={label}
                      onClick={() => toggleLearner(stage.id, learner.id)}
                    >
                      {label}
                    </Chip>
                  );
                })}
                {learners.length === 0 ? (
                  <span className="text-[12px] text-ink-4">有効な受講者がいません</span>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
