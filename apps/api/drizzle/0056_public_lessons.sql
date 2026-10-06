-- ログインなしで読めるレッスン (Issue #41)。教材の unit.json に "public": true を書いた単元の
-- スライドとまとめに seed が 1 を入れ、公開 API (GET /api/public/...) だけが読む。既定は 0 で、
-- CMS で作ったレッスンや既存の行は公開されない。公開 API は匿名で叩かれるので、印のある行だけを
-- 引く部分索引を置く (表を全走査させない)。
ALTER TABLE lessons ADD COLUMN public integer NOT NULL DEFAULT 0;
--> statement-breakpoint
CREATE INDEX lessons_public_idx ON lessons (section_id) WHERE public = 1;
