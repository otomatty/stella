import type { Lesson, Stage } from "../../../apps/web/src/data/types.js";
import { videoManifestKey, type VideoManifest } from "../../content/src/material-video.js";
import { lessonUuid } from "./seed-ids.js";

export function lessonVideoColumns(
  tenantId: string,
  stageId: string,
  lesson: Lesson,
  videoManifest: VideoManifest | null,
) {
  // 台本を削除したら解除。manifest が無い／対象外なら既存値を保持する。
  // ステージ slug とトピック ID の組で、自分のステージの項目を引く。
  const videoEntry = videoManifest?.[videoManifestKey(stageId, lesson.id)];
  const manifestVideo = videoEntry && "video" in videoEntry ? videoEntry : undefined;
  const videoFailure =
    videoEntry && "error" in videoEntry && videoEntry.stageSlug === stageId
      ? videoEntry
      : undefined;
  const narratedSlides = lesson.type === "slides" && lesson.hasNarration;
  const ownedVideo =
    narratedSlides &&
    manifestVideo?.video?.startsWith(`lesson-video/${tenantId}/${stageId}/${lesson.id}/`)
      ? manifestVideo
      : undefined;
  const preserveVideo = narratedSlides && !ownedVideo;
  const preserveVideoIssue = preserveVideo && !videoFailure;
  const videoIssue = preserveVideo && videoFailure ? videoFailure.error : null;
  const videoPath = lesson.type === "slides" ? ownedVideo?.video : lesson.videoPath;
  const scenes = ownedVideo?.scenes;
  return { preserveVideo, preserveVideoIssue, videoIssue, videoPath, scenes };
}

function sqlValue(value: string | null | undefined): string {
  return value == null ? "null" : `'${value.replace(/'/g, "''")}'`;
}

/** 配布済みの動画があるレッスンだけを更新する。失敗の項目では既存の動画を保つ。 */
export function lessonVideoStatements(
  stages: readonly Stage[],
  manifest: VideoManifest,
  tenantId = "ses",
): string[] {
  const statements: string[] = [];
  for (const stage of stages) {
    for (const section of stage.sections ?? []) {
      for (const lesson of section.lessons) {
        if (lesson.type !== "slides" || !lesson.hasNarration) continue;
        const columns = lessonVideoColumns(tenantId, stage.id, lesson, manifest);
        const values = columns.preserveVideo
          ? columns.preserveVideoIssue
            ? []
            : [["video_issue", sqlValue(columns.videoIssue)]]
          : [
              ["video_path", sqlValue(columns.videoPath)],
              ["video_scenes", sqlValue(columns.scenes && JSON.stringify(columns.scenes))],
              ["video_issue", sqlValue(columns.videoIssue)],
            ];
        if (values.length === 0) continue;
        const id = lessonUuid(tenantId, stage.id, lesson.id, lesson.progressRevision);
        const set = values.map(([column, value]) => `${column} = ${value}`).join(", ");
        const changed = values.map(([column, value]) => `${column} is not ${value}`).join(" or ");
        statements.push(`update lessons set ${set} where id = '${id}' and (${changed});`);
      }
    }
  }
  return statements;
}
