ALTER TABLE `profiles` ADD `name_source` text DEFAULT 'invite' NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `avatar_url` text;--> statement-breakpoint
-- 既存プロフィールの表示名を保護する。
--
-- name_source は既定が 'invite' なので、 このままだと運用中の全ユーザーが次回 Google
-- ログインで表示名を上書きされる。 管理者が招待時に入力した氏名は投稿者名や修了証にも
-- 出るため、 意図して付けられた名前は 'user' として同期対象から外す。
--
-- 招待の既定値 (メールのローカル部) のまま = まだ誰も名前を決めていない行なので、
-- 'invite' に残して初回ログイン時に Google の氏名を取り込ませる。 これで「デプロイ前に
-- 招待され、 デプロイ後に初めてログインする」ユーザーも自動取得の対象になる。
UPDATE `profiles` SET `name_source` = 'user'
WHERE `email` IS NULL
   OR `display_name` <> substr(`email`, 1, instr(`email`, '@') - 1);
