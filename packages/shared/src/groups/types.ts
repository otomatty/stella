export interface LearnerGroup {
  id: string;
  name: string;
  memberCount: number;
  shareProgress: boolean;
  shareActivity: boolean;
}

export interface GroupPeerProgress {
  group: Pick<LearnerGroup, "id" | "name">;
  /**
   * 見ている本人のスキルツリーに出る公開中のグループステージ。
   * 親 (`stages.parent`) が先、同じ段は題名順。
   */
  stages: { id: string; title: string }[];
  /** 公開中のグループステージのうち、本人に見えないものが 1 つ以上ある。 */
  hasHiddenStages: boolean;
  members: {
    name: string;
    isMe: boolean;
    /**
     * 見えないステージを始めている (受講登録・レッスン完了・課題合格のいずれか)。
     * 見ている本人は常に false。見えないステージの ID・題名・割合は付けない。
     */
    ahead: boolean;
    stages: { id: string; percent: number; cleared: boolean }[];
  }[];
}

export interface GroupTimelineEvent {
  key: string;
  kind: "stage_start" | "stage_clear" | "task_pass" | "ahead";
  /** 日本時間の日付 (YYYY-MM-DD)。 */
  date: string;
  member: { name: string; isMe: boolean };
  stage: { id: string; title: string } | null;
  task: { id: string; title: string } | null;
  reactions: { emoji: string; count: number; names: string[]; mine: boolean }[];
}

export interface GroupTimeline {
  group: Pick<LearnerGroup, "id" | "name">;
  events: GroupTimelineEvent[];
  nextCursor: string | null;
}
