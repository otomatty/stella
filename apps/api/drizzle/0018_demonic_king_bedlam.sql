-- contract リリース (issue #141): 全環境が categories ベースへ移行済みのため、
-- #137 の expand リリースで残した旧・単一カテゴリ列を落とす。
ALTER TABLE `interview_questions` DROP COLUMN `category`;
