-- 教材の OS 別ブロック (07 §11) で既定に開く OS。null は端末から推定する。
ALTER TABLE profiles ADD COLUMN os_preference text CHECK (os_preference IN ('windows', 'macos'));
--> statement-breakpoint
-- 自動生成 PDF のうち、教材から作らなくなった資料 (OS ごとに分ける・分けないを切り替えた
-- レッスンの旧資料)。行と版履歴は残して staff が旧版を取れるようにし、受講者の一覧からは外す。
ALTER TABLE lesson_materials ADD COLUMN archived_at integer;
