import { type RefObject, useLayoutEffect, useState } from "react";

const STORAGE_KEY = "lms_video_captions_v1";
const VTT_ESCAPES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  nbsp: "\u00a0",
  lrm: "\u200e",
  rlm: "\u200f",
};

export function parseCaptionCue(raw: string): { text: string; onDark: boolean } {
  let onDark = false;
  const text = raw
    .replace(/<[^<>]*>/g, (tag) => {
      const [name] = tag.slice(1, -1).split(/\s+/);
      const [type, ...classes] = name.split(".");
      if (type === "c" && classes.includes("on-dark")) onDark = true;
      return "";
    })
    .replace(/&(amp|lt|gt|nbsp|lrm|rlm);/g, (_, name: string) => VTT_ESCAPES[name])
    .trim();
  return { text, onDark };
}

export function videoPictureRect(
  boxWidth: number,
  boxHeight: number,
  videoWidth: number,
  videoHeight: number,
) {
  if (boxWidth <= 0 || boxHeight <= 0 || videoWidth <= 0 || videoHeight <= 0) return null;
  const scale = Math.min(boxWidth / videoWidth, boxHeight / videoHeight);
  const width = videoWidth * scale;
  const height = videoHeight * scale;
  return { left: (boxWidth - width) / 2, top: (boxHeight - height) / 2, width, height };
}

export function readVideoCaptions(): boolean {
  try {
    return typeof window === "undefined" || window.localStorage.getItem(STORAGE_KEY) !== "0";
  } catch {
    return true;
  }
}

export function writeVideoCaptions(enabled: boolean): void {
  try {
    if (typeof window !== "undefined")
      window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    // 保存できなくても、開いているプレイヤーには設定を反映する。
  }
}

type CaptionState = {
  mediaKey: string;
  available: boolean;
  cues: { text: string; onDark: boolean; key: string }[];
};

export function useVideoCaptions(
  videoRef: RefObject<(HTMLVideoElement & { webkitDisplayingFullscreen?: boolean }) | null>,
  trackRef: RefObject<HTMLTrackElement | null>,
  mediaKey: string | null,
  enabled: boolean,
) {
  const [captions, setCaptions] = useState<CaptionState | null>(null);
  const [picture, setPicture] = useState<ReturnType<typeof videoPictureRect>>(null);

  useLayoutEffect(() => {
    const video = videoRef.current;
    const element = trackRef.current;
    // 配布した字幕用の要素からトラックを取得する。
    const track = element?.track;
    if (mediaKey === null || !video || !element || track?.kind !== "captions") return;

    const syncCues = () => {
      const available =
        element.readyState === HTMLTrackElement.LOADED && Boolean(track.cues?.length);
      const cues: CaptionState["cues"] = [];
      if (available && enabled && !video.webkitDisplayingFullscreen) {
        const time = video.currentTime;
        for (const cue of Array.from(track.activeCues ?? [])) {
          // シーク直後は activeCues の更新より先に時刻が変わることがある。
          if (time < cue.startTime || time >= cue.endTime || !("text" in cue)) continue;
          if (typeof cue.text !== "string") continue;
          const parsed = parseCaptionCue(cue.text);
          const key = JSON.stringify([cue.id, cue.startTime, cue.endTime, cue.text]);
          if (parsed.text && !cues.some((item) => item.key === key)) cues.push({ ...parsed, key });
        }
      }
      setCaptions({ mediaKey, available, cues });
    };

    const syncMode = () => {
      const mode = video.webkitDisplayingFullscreen && enabled ? "showing" : "hidden";
      if (track.mode !== mode) track.mode = mode;
    };
    const syncPicture = () => {
      setPicture(
        videoPictureRect(
          video.clientWidth,
          video.clientHeight,
          video.videoWidth,
          video.videoHeight,
        ),
      );
    };
    const syncFullscreen = () => {
      syncMode();
      syncPicture();
      syncCues();
    };
    const clearCues = () => setCaptions(null);
    const cueEvents = ["seeking", "seeked", "ratechange"];

    const observer = new ResizeObserver(syncPicture);
    observer.observe(video);
    video.addEventListener("resize", syncPicture);
    video.addEventListener("loadedmetadata", syncFullscreen);
    document.addEventListener("fullscreenchange", syncFullscreen);
    video.addEventListener("webkitbeginfullscreen", syncFullscreen);
    video.addEventListener("webkitendfullscreen", syncFullscreen);
    video.addEventListener("emptied", clearCues);
    for (const event of cueEvents) video.addEventListener(event, syncCues);
    video.textTracks.addEventListener("change", syncMode);
    track.addEventListener("cuechange", syncCues);
    element.addEventListener("load", syncCues);
    element.addEventListener("error", clearCues);
    syncFullscreen();

    return () => {
      observer.disconnect();
      video.removeEventListener("resize", syncPicture);
      video.removeEventListener("loadedmetadata", syncFullscreen);
      document.removeEventListener("fullscreenchange", syncFullscreen);
      video.removeEventListener("webkitbeginfullscreen", syncFullscreen);
      video.removeEventListener("webkitendfullscreen", syncFullscreen);
      video.removeEventListener("emptied", clearCues);
      for (const event of cueEvents) video.removeEventListener(event, syncCues);
      video.textTracks.removeEventListener("change", syncMode);
      track.removeEventListener("cuechange", syncCues);
      element.removeEventListener("load", syncCues);
      element.removeEventListener("error", clearCues);
    };
  }, [videoRef, trackRef, mediaKey, enabled]);

  const current = captions?.mediaKey === mediaKey ? captions : null;
  return { available: current?.available ?? false, cues: current?.cues, picture };
}
