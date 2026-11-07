import type { Director } from "./director";

export interface Scenario {
  id: string;
  order: number;
  screen: string;
  title: string;
  summary: string;
  /** 収録を始める前に開いておく画面（Web のルートからのパス） */
  start: string;
  /** 新規ユーザーとして始める（ようこそ画面を表示する） */
  freshUser?: boolean;
  /** 収録するテーマ。未指定なら --theme、どちらも未指定なら light */
  theme?: "light" | "dark";
  /** 既定は seed-learner。freshUser の場合は seed-learner2 */
  user?: string;
  /** --include-drafts を付けたときだけ収録する */
  draft?: boolean;
  run(t: Director): Promise<void>;
}

export function defineScenario(s: Scenario): Scenario {
  return s;
}
