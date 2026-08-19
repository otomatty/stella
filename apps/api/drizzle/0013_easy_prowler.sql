-- 面談対策カテゴリ分割 (#137) の expand リリース。 移行期間中に旧 Worker / 旧 web
-- バンドルが動き続けられるよう、 純粋に追加のみとし既存データには一切触らなかった。
-- 移行完了後の contract リリース (#141) で、 旧割当 ["PHP/JS"] の書き換えは 0017、
-- 旧 category 列の drop は 0018 が行っている。
ALTER TABLE `interview_questions` ADD `categories` text DEFAULT '[]' NOT NULL;
