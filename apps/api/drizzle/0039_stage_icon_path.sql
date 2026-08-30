-- スキルツリーの星に出す講座アイコン (Phase 3a の続き)。
--
-- 正本は教材リポジトリの `courses/<slug>/icon.svg` (単色シルエット SVG) で、seed が
-- 内容ハッシュ入りの R2 キーをこの列に書く。null なら星は状態グリフのまま —
-- 準備中のプレースホルダ講座や CMS で作ったステージは何も変わらない。
-- 列を 1 本足すだけの additive。既存の行・索引は触らない。
ALTER TABLE `stages` ADD COLUMN `icon_path` text;
