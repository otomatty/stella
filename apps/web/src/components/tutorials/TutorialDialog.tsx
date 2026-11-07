import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Tutorial } from "@/lib/tutorials";
import { TutorialPlayer } from "./TutorialPlayer";

export function TutorialDialog({
  tutorial,
  open,
  onOpenChange,
}: {
  tutorial: Tutorial;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{tutorial.title}</DialogTitle>
          <DialogDescription>{tutorial.summary}</DialogDescription>
        </DialogHeader>
        <TutorialPlayer key={tutorial.id} tutorial={tutorial} />
      </DialogContent>
    </Dialog>
  );
}
