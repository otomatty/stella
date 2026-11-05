/**
 * Extra ステージ 1 件の割当。以前の割当カード 1 枚と同じ操作。
 * スマホ幅ではボトムシート、それ以外はダイアログ。
 */

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { SkeletonRows } from "@/components/ui/skeleton";
import { useIsMobileViewport } from "@/hooks/useIsMobileViewport";
import {
  applySavedStageGrants,
  formatSavedStageGrantsMessage,
  listStageGrants,
  saveStageGrants,
  type StageGrantDraft,
  type StageGrantLearnerRow,
  type StageGrantStageRow,
} from "@/lib/stage-grants-api";

const EMPTY_DRAFT: StageGrantDraft = { profileIds: [], unlockedIds: [] };

interface StageGrantEditorProps {
  stageId: string | null;
  stageTitle: string;
  open: boolean;
  onClose: () => void;
  /** 保存できたあと。盤面の割り当て数を取り直す。 */
  onSaved: () => void;
}

export function StageGrantEditor({
  stageId,
  stageTitle,
  open,
  onClose,
  onSaved,
}: StageGrantEditorProps) {
  const isMobile = useIsMobileViewport();
  const [stages, setStages] = useState<StageGrantStageRow[]>([]);
  const [learners, setLearners] = useState<StageGrantLearnerRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, StageGrantDraft>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    if (!open || stageId === null) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void listStageGrants()
      .then((data) => {
        if (cancelled) return;
        setStages(data.stages);
        setLearners(data.learners);
        setDrafts(
          Object.fromEntries(
            data.stages.map((row) => [
              row.id,
              {
                profileIds: [...row.profile_ids],
                unlockedIds: row.unlocked_profile_ids.filter((id) => row.profile_ids.includes(id)),
              },
            ]),
          ),
        );
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "取得に失敗しました");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, stageId]);

  const stage = stageId === null ? undefined : stages.find((row) => row.id === stageId);
  const draft = stageId === null ? EMPTY_DRAFT : (drafts[stageId] ?? EMPTY_DRAFT);

  const toggleLearner = (profileId: string) => {
    if (stageId === null) return;
    setDrafts((prev) => {
      const current = prev[stageId] ?? EMPTY_DRAFT;
      const selected = current.profileIds.includes(profileId);
      const profileIds = selected
        ? current.profileIds.filter((id) => id !== profileId)
        : [...current.profileIds, profileId];
      const unlockedIds = selected
        ? current.unlockedIds.filter((id) => id !== profileId)
        : [...current.unlockedIds];
      return { ...prev, [stageId]: { profileIds, unlockedIds } };
    });
  };

  const toggleUnlock = (profileId: string) => {
    if (stageId === null) return;
    setDrafts((prev) => {
      const current = prev[stageId] ?? EMPTY_DRAFT;
      if (!current.profileIds.includes(profileId)) return prev;
      const unlockedIds = current.unlockedIds.includes(profileId)
        ? current.unlockedIds.filter((id) => id !== profileId)
        : [...current.unlockedIds, profileId];
      return { ...prev, [stageId]: { profileIds: current.profileIds, unlockedIds } };
    });
  };

  const save = async () => {
    if (stageId === null || !stage || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const profileIds = draft.profileIds;
      const unlockedIds = draft.unlockedIds.filter((id) => profileIds.includes(id));
      const saved = await saveStageGrants(stage.id, profileIds, unlockedIds);
      const applied = applySavedStageGrants(
        stages,
        drafts,
        stage.id,
        saved.profile_ids,
        saved.unlocked_profile_ids,
        saved.ancestor_grants,
      );
      setStages(applied.stages);
      setDrafts(applied.drafts);
      toast.success(formatSavedStageGrantsMessage(stage.title, stages, saved.ancestor_grants));
      onSaved();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const body = (
    <GrantBody
      stage={stage}
      learners={learners}
      draft={draft}
      loading={loading}
      error={error}
      saving={saving}
      onToggleLearner={toggleLearner}
      onToggleUnlock={toggleUnlock}
    />
  );
  const canSave = !loading && error === null && stage !== undefined;
  const footer = (
    <>
      <Button type="button" variant="outline" onClick={onClose}>
        閉じる
      </Button>
      <Button
        type="button"
        variant="primary"
        disabled={!canSave || saving}
        onClick={() => void save()}
      >
        {saving ? "保存中…" : "保存"}
      </Button>
    </>
  );

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onOpenChange={(next) => {
          if (!next) onClose();
        }}
      >
        <DrawerContent className="max-h-[85dvh]">
          <DrawerHeader>
            <DrawerTitle>受講者を割り当てる</DrawerTitle>
            <DrawerDescription>{stageTitle}</DrawerDescription>
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">{body}</div>
          <DrawerFooter className="flex-row justify-end">{footer}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="flex max-h-[85vh] w-[min(calc(100vw-2rem),520px)] flex-col gap-0">
        <DialogHeader>
          <DialogTitle>受講者を割り当てる</DialogTitle>
          <DialogDescription>{stageTitle}</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">{body}</div>
        <DialogFooter className="shrink-0">{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function learnerLabel(learner: StageGrantLearnerRow): string {
  return learner.selectable ? learner.display_name : `${learner.display_name}（無効）`;
}

function GrantBody({
  stage,
  learners,
  draft,
  loading,
  error,
  saving,
  onToggleLearner,
  onToggleUnlock,
}: {
  stage: StageGrantStageRow | undefined;
  learners: StageGrantLearnerRow[];
  draft: StageGrantDraft;
  loading: boolean;
  error: string | null;
  saving: boolean;
  onToggleLearner: (profileId: string) => void;
  onToggleUnlock: (profileId: string) => void;
}) {
  if (loading) {
    return <SkeletonRows rows={4} />;
  }
  if (error) {
    return <p className="text-[12.5px] text-destructive">一覧の取得に失敗しました: {error}</p>;
  }
  if (!stage) {
    return <p className="text-[12.5px] text-ink-3">このステージの割当は編集できません。</p>;
  }

  const assignedLearners = learners.filter((learner) => draft.profileIds.includes(learner.id));

  return (
    <div>
      <p className="mb-3 text-[12px] text-ink-4">
        {stage.category ? `${stage.category} · ` : ""}
        {stage.slug}
      </p>
      <p className="mb-2 text-[12px] text-ink-3">割り当てる受講者</p>
      <div className="flex flex-wrap gap-2">
        {learners.map((learner) => {
          const label = learnerLabel(learner);
          return (
            <Chip
              key={learner.id}
              active={draft.profileIds.includes(learner.id)}
              disabled={saving}
              ariaLabel={label}
              onClick={() => onToggleLearner(learner.id)}
            >
              {label}
            </Chip>
          );
        })}
        {learners.length === 0 ? (
          <span className="text-[12px] text-ink-4">有効な受講者がいません</span>
        ) : null}
      </div>
      <p className="mb-1 mt-4 text-[12px] text-ink-3">入口を開ける受講者</p>
      <p className="mb-2 text-[12px] text-ink-4">
        前提のステージを終えていなくても、このステージを始められるようにします（選考の課題など）。割り当てた受講者から選びます。
      </p>
      <div className="flex flex-wrap gap-2">
        {assignedLearners.map((learner) => {
          const label = learnerLabel(learner);
          return (
            <Chip
              key={learner.id}
              active={draft.unlockedIds.includes(learner.id)}
              disabled={saving}
              ariaLabel={`入口を開ける ${label}`}
              onClick={() => onToggleUnlock(learner.id)}
            >
              {label}
            </Chip>
          );
        })}
      </div>
    </div>
  );
}
