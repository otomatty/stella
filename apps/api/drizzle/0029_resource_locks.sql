-- Issue #237 — 質問ごとの排他ロック。
--
-- 面談対策の読み上げ音声は R2 に置くが、 R2 にも D1 にも比較交換 (compare-and-swap) が
-- 無いため、 「本文を読んでから R2 を触る」形では読み直しと書き込みの間に隙間が残る。
-- 本文の更新と音声の更新をこのロックの中でまとめて行い、 同じ質問への同時操作を
-- 直列化する。 期限を持たせてあるので、 保持中に Worker が落ちても自然に解放される。
CREATE TABLE `resource_locks` (
	`id` text PRIMARY KEY NOT NULL,
	`holder` text NOT NULL,
	`expires_at` integer NOT NULL
);
