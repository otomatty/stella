import { useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { TutorialPlayer } from "@/components/tutorials/TutorialPlayer";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Role } from "@/data/types";
import { ExternalLink, HelpCircle } from "@/lib/icons";
import { formatDuration, tutorialsForPath, useTutorials } from "@/lib/tutorials";

export function HelpVideoButton({ role }: { role: Role }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const list = useTutorials();
  const videos = role === "learner" ? tutorialsForPath(pathname, list) : [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = videos.find((video) => video.id === selectedId);
  const tutorial = selected ?? videos[0];
  if (!tutorial) return null;

  const hasMultipleVideos = videos.length > 1;
  return (
    <Dialog
      onOpenChange={(open) => {
        if (open) setSelectedId(null);
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="w-[34px] h-[34px] rounded-full grid place-items-center text-ink-2 hover:bg-sunken border border-transparent hover:border-border"
          title="この画面の使い方 (動画)"
          aria-label="この画面の使い方 (動画)"
        >
          <HelpCircle size={16} />
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="pr-6">
            {hasMultipleVideos ? "この画面の使い方" : tutorial.title}
          </DialogTitle>
          {hasMultipleVideos && (
            <div className="flex flex-wrap gap-2">
              {videos.map((video) => (
                <Button
                  key={video.id}
                  type="button"
                  variant={video.id === tutorial.id ? "primary" : "outline"}
                  aria-pressed={video.id === tutorial.id}
                  className="min-h-8 h-auto max-w-full whitespace-normal text-left"
                  onClick={() => setSelectedId(video.id)}
                >
                  {video.title} ({formatDuration(video.duration)})
                </Button>
              ))}
            </div>
          )}
          <DialogDescription>{tutorial.summary}</DialogDescription>
        </DialogHeader>
        <div className="min-w-0 px-4 sm:px-6">
          <TutorialPlayer key={tutorial.id} tutorial={tutorial} />
        </div>
        <DialogFooter>
          <a
            href="/support"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-2 hover:text-ink-1 underline underline-offset-2"
          >
            解決しない場合はサポートページへ
            <ExternalLink size={12} />
          </a>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
