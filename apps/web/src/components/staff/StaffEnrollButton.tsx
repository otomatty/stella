import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { staffEnrollStage } from "@/lib/skill-map-api";

export function StaffEnrollButton({
  stageId,
  onOpenAsLearner,
}: {
  stageId: string;
  onOpenAsLearner: (stageId: string) => void;
}) {
  const [pending, setPending] = useState(false);
  const open = async () => {
    setPending(true);
    try {
      await staffEnrollStage(stageId);
      onOpenAsLearner(stageId);
    } catch (err: unknown) {
      toast.error(`開けませんでした: ${err instanceof Error ? err.message : "unknown"}`);
    } finally {
      setPending(false);
    }
  };
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      title="初めて開くときは自分を受講登録します"
      disabled={pending}
      onClick={() => void open()}
    >
      受講者の画面で確かめる
    </Button>
  );
}
