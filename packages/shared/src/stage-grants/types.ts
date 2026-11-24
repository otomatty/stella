/** 案内はプレーンテキスト。due_at はタイムゾーン付き ISO 日時 (応答は UTC)。 */
export interface StageGrantGuidance {
  source_name: string | null;
  due_at: string | null;
  message: string | null;
}

/** 全員を指定する場合は profile_ids の代わりに all: true。案内は全項目を置き換える。 */
export type StageGrantGuidanceRequest = StageGrantGuidance &
  ({ all: true; profile_ids?: never } | { profile_ids: string[]; all?: never });

export interface StageGrantSources {
  manual: boolean;
  groups: { id: string; name: string }[];
}

export interface StageGrantGuidanceSummary {
  uniform: boolean;
  /** 割り当てなし、または混在しているときは null。 */
  guidance: StageGrantGuidance | null;
}

export interface GuidedStage extends StageGrantGuidance {
  stage_id: string;
  title: string;
  status: "available" | "in-progress" | "locked";
  prerequisite_titles: string[];
  /** 名前を伏せた前提があるか。名前・件数は返さない。旧APIでの省略は false と扱う。 */
  prerequisites_withheld?: boolean;
  progress: { unit: "problems" | "tasks"; passed: number; total: number };
}

export interface GuidedStagesResponse {
  stages: GuidedStage[];
}

/** スキルツリーの従来項目は維持し、ホームの通常の道に使う値を別に返す。 */
export interface UnguidedHomeFields {
  unguided_next_stage_ids: string[];
  has_unguided_enrollment: boolean;
}
