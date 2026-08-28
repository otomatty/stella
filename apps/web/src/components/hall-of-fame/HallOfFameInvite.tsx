/**
 * ホームのお知らせ枠に出る「殿堂への招待」(Phase 5)。
 *
 * 出るのは **招待が届いている (`nominated`) か、取り下げた掲載が残っている
 * (`withdrawn`) とき**。書きかけ (`submitted`) や掲載中は出さない — 一度応えた人に
 * 同じ呼びかけを出し続けない。取り下げを出すのは、そこが編集の入口だから
 * (画面は「直したいときは一度取り下げて」と案内する)。
 *
 * ## 新しい掲載の全員向け通知は作らない
 *
 * 殿堂に誰かが載るたびに全受講者へ通知を撒くと、「載っていない自分」を定期的に
 * 突きつける仕組みになる。新着を伝えたいときは既存のお知らせ (announcements) を
 * 運営が書けばよく、そこには「今回はこういう理由で載った」という文脈が付く。
 * だから自動通知 (`notifications` の fan-out) はこの機能では作らない。
 */

import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

import { Star } from "@/lib/icons";
import { isBackendConfigured } from "@/lib/backend";
import { getMyHallOfFameEntry } from "@/lib/hall-of-fame-api";

/** ホームに殿堂の行を出すか (招待が届いた / 取り下げた掲載が残っている)。 */
export type HallOfFameInviteKind = "invited" | "withdrawn" | null;

/** 呼び出し側が空状態の出し分けにも使う。 */
export function useHallOfFameInvite(enabled: boolean): HallOfFameInviteKind {
  const [invited, setInvited] = useState<HallOfFameInviteKind>(null);

  useEffect(() => {
    let cancelled = false;
    if (!enabled || !isBackendConfigured()) return () => undefined;
    void (async () => {
      try {
        const mine = await getMyHallOfFameEntry();
        if (cancelled) return;
        if (mine?.status === "nominated") setInvited("invited");
        else if (mine?.status === "withdrawn") setInvited("withdrawn");
        else setInvited(null);
      } catch {
        // 招待の取得に失敗しても、ホームにエラーを出すほどのものではない
        // (次に開いたときに出る)。他のカードの邪魔をしない側に倒す。
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return invited;
}

/** お知らせ枠に差し込む 1 行 (出す / 出さないの判断は `useHallOfFameInvite`)。 */
export function HallOfFameInviteRow({ kind = "invited" }: { kind?: "invited" | "withdrawn" }) {
  return (
    <Link
      to="/hall-of-fame/edit"
      className="flex gap-3 px-4 py-3 border-b border-border hover:bg-sunken"
    >
      <div
        className="shrink-0 w-2 h-2 rounded-full mt-1.5"
        style={{ background: "var(--sf-magenta)" }}
      />
      <div className="min-w-0">
        <div className="font-medium text-[13px] leading-snug flex items-center gap-1.5">
          <Star size={13} className="text-brand" />
          {kind === "withdrawn" ? "取り下げた掲載が残っています" : "殿堂への招待が届いています"}
        </div>
        <div className="text-[11.5px] text-ink-2 mt-0.5">
          {kind === "withdrawn"
            ? "内容を直して、もう一度掲載を申請できます。そのままにしておいても構いません。"
            : "掲載するかどうかはあなたが決められます。辞退しても不利益はありません。"}
        </div>
      </div>
    </Link>
  );
}
