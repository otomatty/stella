-- 発見教材 (Discovery) — AI が作った補強演習の共有ライブラリ (Phase 4)。
--
-- 新規テーブルだけの additive。既存の列・行・索引は触らないので、0036 まで適用済みの
-- DB にもまっさらな DB にも同じように当たる。
--
-- **3 つに分かれる理由**: 「つまずいた事実」(discovery_requests)、「作った教材」
-- (discovery_materials)、「受けた記録」(discovery_attempts) は寿命も読み手も違う。
-- リクエストは講師の作業待ち行列で、教材が生まれれば役目が終わる。教材は全ユーザー
-- 共有の資産で、受講者ごとの状態を持たない。受験記録だけが利用者に紐づく。
CREATE TABLE `discovery_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	-- つまずいた文脈のあるステージ (= 教材の源流)。公開条件もこのステージで判定する。
	`stage_id` text NOT NULL,
	-- つまずきの短文 (小テスト名 / 課題名から作る)。生成プロンプトの材料。
	`topic` text NOT NULL,
	`origin` text DEFAULT 'quiz_fail' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`stage_id`) REFERENCES `stages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
-- **user_id を持たない。** 誰がつまずいたかは教材に紐づけない — 共有ライブラリに
-- 個人の失敗履歴を残すと、講師の一覧が「誰が何を落としたか」の名簿になってしまう。
-- 同じ文脈のつまずきは何人ぶんでも 1 行に畳む (この一意索引が upsert の衝突先)。
CREATE UNIQUE INDEX `discovery_requests_topic_uq` ON `discovery_requests` (`tenant_id`,`stage_id`,`topic`);--> statement-breakpoint
-- AI が生成した補強演習 (全ユーザー共有)。受講者ごとの複製は作らない。
CREATE TABLE `discovery_materials` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`stage_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	-- 選択式設問の配列 (正答フラグを含む)。**受講者向けの応答では必ず落とす。**
	`questions` text DEFAULT '[]' NOT NULL,
	`source` text DEFAULT 'ai' NOT NULL,
	-- 下書きを作った実体。'heuristic' は AI を呼べなかったときのフォールバックで、
	-- 出自として画面にも出す (「AI が書いた」と誤って伝えないため)。
	`generator` text DEFAULT 'anthropic' NOT NULL,
	-- 公開されるのは 'approved' だけ。生成直後は必ず 'draft'。
	`review_status` text DEFAULT 'draft' NOT NULL,
	-- 公開条件。いまは 'stage_active_or_cleared' 固定だが、将来の拡張用に text。
	`unlock_condition` text DEFAULT 'stage_active_or_cleared' NOT NULL,
	-- 元になったリクエスト。リクエストを消しても教材は残す (ON DELETE set null)。
	`request_id` text,
	`created_at` integer NOT NULL,
	`reviewed_by` text,
	`reviewed_at` integer,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`stage_id`) REFERENCES `stages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`request_id`) REFERENCES `discovery_requests`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
-- 公開判定は「テナント × ステージ × 承認済み」で引く (受講者 1 人ぶんの一覧)。
CREATE INDEX `discovery_materials_stage_idx` ON `discovery_materials` (`tenant_id`,`stage_id`,`review_status`);--> statement-breakpoint
-- 受験記録。**quiz_attempts を流用しない** — あちらは `quiz_id` 必須 (FK) で、
-- 発見教材は小テストではないので載せる id が無い。無理に混ぜると XP の
-- 「合格した小テスト数」に数えられ、小テストの受験回数上限にも混ざる。
CREATE TABLE `discovery_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`user_id` text NOT NULL,
	`material_id` text NOT NULL,
	`score` integer NOT NULL,
	`max_score` integer NOT NULL,
	`percent` integer NOT NULL,
	`passed` integer NOT NULL,
	`submitted_at` integer NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`material_id`) REFERENCES `discovery_materials`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
-- 「この人はこの教材に合格したか」(XP と受験履歴) をこの索引で引く。
CREATE INDEX `discovery_attempts_user_material_idx` ON `discovery_attempts` (`user_id`,`material_id`,`submitted_at`);
