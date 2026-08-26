-- 教材バージョン管理 (docs/superpowers/specs/2026-08-26-material-pdf-auto-conversion-design.md)
-- 本文のリビジョン履歴と、自動生成 PDF (配布資料) の版履歴。
CREATE TABLE `lesson_revisions` (
	`lesson_id` text NOT NULL,
	`revision` integer NOT NULL,
	`source_hash` text NOT NULL,
	`markdown` text,
	`source` text DEFAULT 'seed' NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`lesson_id`, `revision`),
	FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE TABLE `lesson_material_versions` (
	`material_id` text NOT NULL,
	`version` integer NOT NULL,
	`path` text NOT NULL,
	`source_hash` text NOT NULL,
	`lesson_revision` integer,
	`size_bytes` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`material_id`, `version`),
	FOREIGN KEY (`material_id`) REFERENCES `lesson_materials`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
ALTER TABLE `lesson_materials` ADD `source` text DEFAULT 'upload' NOT NULL;--> statement-breakpoint
-- 版管理導入前から存在するレッスン (CMS 作成分を含む) の現在本文を基準リビジョンとして
-- 積む。導入前の本文が最初の編集で失われないようにするため。SQLite では SHA-256 を
-- 計算できないので source_hash は番兵値 'pre-versioning'。seed が正本のレッスンは、
-- 次の seed が番兵行を消して実ハッシュ入りの revision 1 を入れ直す
-- (export-seed-sql.ts の emitLessonRevision)。CMS レッスンの番兵行は基準として残り、
-- 本文比較 (lesson-revision.ts) で変更判定されるので実害はない。
INSERT INTO `lesson_revisions` (`lesson_id`, `revision`, `source_hash`, `markdown`, `source`, `created_by`, `created_at`)
SELECT `id`, 1, 'pre-versioning', `markdown`, 'seed', null, cast(unixepoch('subsec') * 1000 as integer)
FROM `lessons` WHERE `markdown` IS NOT NULL;
