-- 面談対策・スキルシート・営業ロールの廃止。
--
-- 面談対策 (想定質問・割当・進捗・改善点メモ・今日の練習セット・個別回答の型・その生成ジョブ) と、
-- 面談対策の画面にだけあったスキルシートのテーブルを落とす。どれも他の表から参照されていない
-- (外部キーは profiles / tenants へ向くだけ) ので、子から順に落とす必要はない。
--
-- 落とす前に、面談対策の通知を消す (通知の種類ごと廃止したので、残すと画面が知らない種類になる)。
DELETE FROM `notifications` WHERE `type` IN ('interview_date_set', 'interview_answer_template_generated', 'interview_answer_template_failed');
--> statement-breakpoint
DROP TABLE IF EXISTS `interview_practice_sets`;
--> statement-breakpoint
DROP TABLE IF EXISTS `interview_fix_notes`;
--> statement-breakpoint
DROP TABLE IF EXISTS `interview_progress`;
--> statement-breakpoint
DROP TABLE IF EXISTS `interview_personal_templates`;
--> statement-breakpoint
DROP TABLE IF EXISTS `interview_prep_assignments`;
--> statement-breakpoint
DROP TABLE IF EXISTS `interview_questions`;
--> statement-breakpoint
DROP TABLE IF EXISTS `generation_jobs`;
--> statement-breakpoint
DROP TABLE IF EXISTS `skill_sheets`;
--> statement-breakpoint
-- 営業ロール (sales) は面談対策のためのロールだったので一緒に廃止する。残っている営業の
-- アカウントは、いちばん権限の小さい受講者に変えたうえで無効化する — 受講者のまま有効に
-- すると、学習を始めていない「受講者」として講師のダッシュボードや集計に混ざるため。
-- 個人の本棚などの行は消さない。続けて使う人は、管理者がユーザー管理で復帰させてロールを選び直す。
UPDATE `profiles` SET `role` = 'student', `disabled` = 1 WHERE `role` = 'sales';
