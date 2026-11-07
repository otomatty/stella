import { useState } from "react";
import { formatDuration, type Tutorial, tutorialById, useTutorials } from "@/lib/tutorials";
import { Button } from "@/components/ui/button";
import { TutorialDialog } from "./TutorialDialog";

export function TutorialCard({ tutorial }: { tutorial: Tutorial }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full overflow-hidden rounded-xl border border-border bg-card text-left hover:bg-sunken"
      >
        <img
          src={tutorial.poster}
          alt=""
          loading="lazy"
          className="aspect-video w-full object-cover"
        />
        <span className="block p-3 text-sm font-semibold">{tutorial.title}</span>
        <span className="flex justify-between px-3 pb-3 text-xs text-ink-2">
          <span>▶ 再生する</span>
          {formatDuration(tutorial.duration)}
        </span>
      </button>
      <TutorialDialog tutorial={tutorial} open={open} onOpenChange={setOpen} />
    </>
  );
}

export function OverviewTutorialButton() {
  const list = useTutorials();
  const tutorial = tutorialById("overview", list);
  const [open, setOpen] = useState(false);
  if (!tutorial) return null;
  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="mt-1.5 h-auto whitespace-normal text-xs"
        onClick={() => setOpen(true)}
      >
        STELLA で学ぶ流れを動画で見る ({formatDuration(tutorial.duration)})
      </Button>
      <TutorialDialog tutorial={tutorial} open={open} onOpenChange={setOpen} />
    </>
  );
}
