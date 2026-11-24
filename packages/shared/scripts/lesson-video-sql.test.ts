import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { expect, it } from "vitest";
import type { Lesson, Stage } from "../../../apps/web/src/data/types.js";
import { lessonVideoStatements } from "./lesson-video-sql.js";
import { videoKeys } from "../../content/src/material-video.js";

const lesson: Lesson = {
  id: "topic",
  title: "教材",
  type: "slides",
  duration: "",
  status: "todo",
  hasNarration: true,
  progressRevision: 2,
};
const stage: Stage = {
  id: "sample",
  title: "教材",
  color: "indigo",
  category: "",
  lessonsCount: 1,
  progress: 0,
  sections: [{ id: "section", title: "", lessons: [lesson] }],
};
const key = "sample/topic";
const keys = videoKeys(stage.id, lesson.id, "content-hash");
const scene = { id: "scene", startSec: 0, durationSec: 2, hash: "scene-hash" };

function setup() {
  const db = new DatabaseSync(":memory:");
  db.exec(`create table lessons (id text primary key, title text, total_sec integer,
    video_path text, video_issue text, video_scenes text);`);
  // seed の名前空間を独立に計算し、版付きの既存行だけが変わることを確かめる。
  const digest = createHash("sha1").update("lesson:ses:sample:topic@r2").digest("hex");
  const id = `${digest.slice(0, 8)}-${digest.slice(8, 12)}-5${digest.slice(13, 16)}-${((Number.parseInt(digest[16], 16) & 3) | 8).toString(16)}${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
  return { db, id };
}

it("版付きの UUID で既存行の動画列だけを更新し、行がなければ何も書かない", () => {
  const { db, id } = setup();
  try {
    const sql = lessonVideoStatements([stage], {
      [key]: { ...keys, durationSec: 2, scenes: [scene] },
    }).join("\n");
    db.exec(sql);
    expect(db.prepare("select * from lessons").all()).toEqual([]);
    db.prepare("insert into lessons values (?, 'タイトル', 90, 'old.mp4', '旧エラー', null)").run(
      id,
    );
    db.exec(sql);
    expect(db.prepare("select * from lessons").get()).toEqual({
      id,
      title: "タイトル",
      total_sec: 90,
      video_path: keys.video,
      video_issue: null,
      video_scenes: JSON.stringify([scene]),
    });
    db.exec(sql);
    expect(db.prepare("select changes() as count").get()).toEqual({ count: 0 });
  } finally {
    db.close();
  }
});

it("seed と同様に、対象ステージの失敗理由だけを更新する", () => {
  const { db, id } = setup();
  try {
    db.prepare(
      "insert into lessons values (?, 'タイトル', 90, 'old.mp4', '旧エラー', 'old-scenes')",
    ).run(id);
    expect(lessonVideoStatements([stage], {})).toEqual([]);
    expect(
      lessonVideoStatements([stage], { [key]: { stageSlug: "another-stage", error: "理由" } }),
    ).toEqual([]);
    expect(
      lessonVideoStatements([stage], {
        [key]: { ...keys, video: "lesson-video/ses/other/topic/hash.mp4", durationSec: 2 },
      }),
    ).toEqual([]);
    db.exec(
      lessonVideoStatements([stage], {
        [key]: { stageSlug: stage.id, error: "読み上げの失敗 '理由'" },
      }).join("\n"),
    );
    expect(db.prepare("select video_path, video_issue, video_scenes from lessons").get()).toEqual({
      video_path: "old.mp4",
      video_issue: "読み上げの失敗 '理由'",
      video_scenes: "old-scenes",
    });
  } finally {
    db.close();
  }
});
