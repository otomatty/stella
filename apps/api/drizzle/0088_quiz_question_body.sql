-- 知識問題の見出しと選択肢の間に書かれた Markdown 本文を保存する。
ALTER TABLE `quiz_questions` ADD `body` text DEFAULT '' NOT NULL;
