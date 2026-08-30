-- スキルツリーで線を引く親 (slug)。正本は course.json の `parent`
-- (前提が 1 つなら省略 = その前提。manifest が補完して seed に渡す)。
-- 線・配置・視界はこの 1 本、解放条件は `prerequisites` 全部 (AND) のまま。
-- null なら評価器が `prerequisites` の先頭に倒す (CMS で作ったステージ)。
-- 列を 1 本足すだけの additive。既存の行・索引は触らない。
ALTER TABLE `stages` ADD COLUMN `parent` text;
