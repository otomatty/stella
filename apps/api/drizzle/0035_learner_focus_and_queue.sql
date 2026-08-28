-- 学習フォーカス (いま進める 1 ステージ) と「次にやるリスト」(キュー) の永続化 (Phase 2)。
--
-- どちらも新規テーブルだけの additive。既存の列・行・索引は触らないので、0034 まで
-- 適用済みの DB にもまっさらな DB にも同じように当たる。
--
-- **なぜ D1 に持つか**: アクティブステージは Phase 1 まで「直近に進捗が付いた未クリアの
-- ステージ」を毎回導出していた。導出は復習で古い星を開いた直後に別の星へ飛ぶし、
-- 「◯◯を一時停止して切り替える」という受講者の意思をどこにも残せない。意思は
-- 端末をまたいで効くべきなので localStorage ではなくサーバに置く。
-- 導出は「まだ一度も選んでいない受講者」のフォールバックとして残す (skill-map-data.ts)。
CREATE TABLE `learner_focus` (
	`user_id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	-- null は「フォーカスを外した」= 導出フォールバックに戻す、の意。行ごと消さないのは
	-- 「一度も選んでいない」と「明示的に外した」を将来区別できるようにするため。
	`active_stage_id` text,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`active_stage_id`) REFERENCES `stages`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
-- 「次にやるリスト」。アクティブでないステージを受講者が自分で並べる待ち行列で、
-- 学習の正本 (enrollments) ではない。並び順は `order` の昇順で、詰め直しは API 側が
-- 0..n-1 に振り直す (歯抜けを許すと並べ替えのたびに比較がややこしくなる)。
CREATE TABLE `stage_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`user_id` text NOT NULL,
	`stage_id` text NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`added_at` integer NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`stage_id`) REFERENCES `stages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
-- 同じステージを二重にキューへ積ませない (追加は insert + do nothing の衝突先)。
CREATE UNIQUE INDEX `stage_queue_user_stage_uq` ON `stage_queue` (`user_id`,`stage_id`);--> statement-breakpoint
-- 一覧は常に本人ぶんを順番どおりに引く。
CREATE INDEX `stage_queue_user_order_idx` ON `stage_queue` (`user_id`,`order`);
