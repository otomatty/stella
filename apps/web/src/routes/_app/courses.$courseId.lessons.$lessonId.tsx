/**
 * 旧 URL 互換 — `/courses/$courseId/lessons/$lessonId` →
 * `/stages/$stageId/lessons/$lessonId`。詳細は `courses.index.tsx` の注記を参照。
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/courses/$courseId/lessons/$lessonId")({
  beforeLoad: ({ params }) => {
    // 検索パラメータは引き継ぐ (`search: true`)。旧 URL には ?code=... 付きの
    // ディープリンクがあり、既定では捨てられてしまうため。
    throw redirect({
      to: "/stages/$stageId/lessons/$lessonId",
      params: { stageId: params.courseId, lessonId: params.lessonId },
      search: true,
      replace: true,
    });
  },
});
