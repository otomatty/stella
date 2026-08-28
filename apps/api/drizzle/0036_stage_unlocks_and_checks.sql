-- 腕試し (SkillCheck) と飛び級で開いた星の記録 (Phase 3a)。
--
-- 新規テーブルだけの additive。既存の列・行・索引は触らないので、0035 まで適用済みの
-- DB にもまっさらな DB にも同じように当たる。
--
-- **なぜ 2 つに分かれるか**: 「開いた」(stage_unlocks) と「受けた」(skill_check_attempts)
-- は寿命も読み手も違う。前者は評価器の入力 (1 人 1 ステージ 1 行、消えたら星が閉じる)、
-- 後者は履歴 (何度でも積まれ、消しても解放は残る)。1 テーブルに畳むと「最後の受験が
-- 不合格だったら閉じる」ような読み方を誘発する — 一度開いた星は閉じない。
CREATE TABLE `stage_unlocks` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`user_id` text NOT NULL,
	`stage_id` text NOT NULL,
	-- 開いた経路。いまは腕試し合格 ('skill_check') だけだが、将来 staff の手動解放や
	-- プレースメント (Phase 3b) が増えるので、経路を残しておく。
	`via` text DEFAULT 'skill_check' NOT NULL,
	`unlocked_at` integer NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`stage_id`) REFERENCES `stages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
-- 同じ星を二重に解放しない (合格のたびの upsert の衝突先)。
CREATE UNIQUE INDEX `stage_unlocks_user_stage_uq` ON `stage_unlocks` (`user_id`,`stage_id`);--> statement-breakpoint
-- 腕試しの受験履歴。
--
-- **quiz_attempts を流用しない**: あちらは `quiz_id` 必須 (FK) で 1 つの小テストに
-- 紐づく。腕試しはステージ内の複数の小テストから抜き出した混成なので、載せる
-- `quiz_id` が無い。無理に 1 つ選んで入れると (a) その小テストの合格数として XP に
-- 数えられ (`countDistinct(quiz_id) where passed`)、(b) 受験回数の上限判定
-- (`quizzes.max_attempts`) にも混ざる。どちらも「小テストを解いた」という意味を
-- 壊すので、別テーブルにする。
CREATE TABLE `skill_check_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`user_id` text NOT NULL,
	`stage_id` text NOT NULL,
	`score` integer NOT NULL,
	`max_score` integer NOT NULL,
	`passed` integer NOT NULL,
	-- 出題した設問 id と受け取った解答 (JSON)。あとから「何を出して何を答えたか」を
	-- 追えるようにする。出題は user_id × stage_id × 受験回数から決まる (乱数を使わない)
	-- ので再現もできるが、教材が編集されると再現できなくなるため実物を残す。
	`question_ids` text DEFAULT '[]' NOT NULL,
	`answers` text DEFAULT '[]' NOT NULL,
	`submitted_at` integer NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`stage_id`) REFERENCES `stages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
-- 出題 (今回が何回目か) と履歴表示のどちらも「本人 × ステージ」で引く。
CREATE INDEX `skill_check_attempts_user_stage_idx` ON `skill_check_attempts` (`user_id`,`stage_id`,`submitted_at`);
