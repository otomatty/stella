-- 本棚の廃止 (2026-11)。オーナーの指示により、残っている本棚のデータも削除する。
-- 0079: 0078_integrations の適用後、0070 後の 7 表を、外部キーで参照する子から先に落とす。
-- 本棚専用の通知・監査 action はない。R2 はデプロイの retire-library-storage.ts が片付ける。
DROP TABLE IF EXISTS `library_revision_files`;
--> statement-breakpoint
DROP TABLE IF EXISTS `library_chapters`;
--> statement-breakpoint
DROP TABLE IF EXISTS `library_shelf_entries`;
--> statement-breakpoint
DROP TABLE IF EXISTS `library_reader_states`;
--> statement-breakpoint
DROP TABLE IF EXISTS `library_files`;
--> statement-breakpoint
DROP TABLE IF EXISTS `library_books`;
--> statement-breakpoint
DROP TABLE IF EXISTS `library_r2_purges`;
