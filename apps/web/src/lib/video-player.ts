import type { CommentMarker } from "@stella/shared/lessons/comments";

export function timeAtPointer(
  clientX: number,
  { left, width }: { left: number; width: number },
  duration: number,
): number {
  const fraction = (clientX - left) / width;
  if (width <= 0 || !Number.isFinite(fraction) || !Number.isFinite(duration) || duration <= 0) {
    return 0;
  }
  return Math.min(1, Math.max(0, fraction)) * duration;
}

function splitTime(time: number) {
  const wholeSeconds = Number.isFinite(time) ? Math.max(0, Math.floor(time)) : 0;
  return {
    hours: Math.floor(wholeSeconds / 3600),
    minutes: Math.floor(wholeSeconds / 60) % 60,
    seconds: wholeSeconds % 60,
  };
}

export function formatVideoTime(time: number): string {
  const { hours, minutes, seconds } = splitTime(time);
  const paddedSeconds = String(seconds).padStart(2, "0");
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${paddedSeconds}`
    : `${minutes}:${paddedSeconds}`;
}

function formatSpokenTime(time: number): string {
  const { hours, minutes, seconds } = splitTime(time);
  return `${hours > 0 ? `${hours}時間` : ""}${minutes}分${seconds}秒`;
}

export function formatSeekValue(time: number, duration: number): string {
  return `${formatSpokenTime(time)} / ${formatSpokenTime(duration)}`;
}

interface MarkerCluster {
  positionSec: number;
  ids: string[];
  count: number;
  resolved: boolean;
  authorName: string;
  excerpt: string;
}

export function clusterMarkers(
  markers: readonly CommentMarker[],
  duration: number,
  bucket = 0.02,
): MarkerCluster[] {
  if (!Number.isFinite(duration) || duration <= 0) return [];
  const sorted = [...markers].sort((a, b) => a.position_sec - b.position_sec);
  const clusters: MarkerCluster[] = [];
  const maxGap = duration * bucket;
  let previousPosition = -Infinity;
  for (const marker of sorted) {
    const positionSec = Math.min(marker.position_sec, duration);
    const cluster = clusters.at(-1);
    if (cluster && positionSec <= previousPosition + maxGap) {
      cluster.ids.push(marker.id);
      cluster.count++;
      cluster.resolved &&= marker.resolved;
    } else {
      clusters.push({
        positionSec,
        ids: [marker.id],
        count: 1,
        resolved: marker.resolved,
        authorName: marker.author_name,
        excerpt: marker.excerpt,
      });
    }
    previousPosition = positionSec;
  }
  return clusters;
}
