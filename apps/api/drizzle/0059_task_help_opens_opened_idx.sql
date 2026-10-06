-- つまずきの検知 (ヒントを最後まで開く、#38) が、直近に開いたヒントを15分ごとに引く。
-- 表を全部読まずに、開いた時刻の範囲から受講者と課題を絞る。
CREATE INDEX task_help_opens_opened_idx ON task_help_opens(opened_at);
