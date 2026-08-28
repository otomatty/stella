-- 殿堂 (Hall of Fame) — 実在の受講者のストーリー (Phase 5)。
--
-- 新規テーブル 1 つだけの additive。既存の列・行・索引は触らないので、0037 まで適用
-- 済みの DB にもまっさらな DB にも同じように当たる。
--
-- **1 人 1 行** (unique(tenant_id, user_id))。推薦 → 記入 → 公開 → 辞退 / 取り下げまでを
-- 同じ行の `status` で表す。履歴テーブルに分けないのは、殿堂に必要なのは「今この人が
-- 載っているか」だけで、辞退や取り下げの経緯を後から掘り返せる形にしておくこと自体が
-- 本人への圧力になるため (辞退は監査ログにも残さない)。
CREATE TABLE `hall_of_fame_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	-- 掲載される本人。プロフィールを消したら殿堂の行も消える (実名が残らない)。
	`user_id` text NOT NULL,
	-- 'nominated'(推薦) → 'submitted'(本人が申請) → 'published'(公開)。
	-- 本人が降りる先が 'declined'(辞退) / 'withdrawn'(取り下げ)。
	-- **公開へ進めるのは submitted からだけ** — 本人の記入と申請を経ない公開経路を作らない。
	`status` text DEFAULT 'nominated' NOT NULL,
	-- 本人が名乗るジョブ (自由記述・40 字まで)。**表示専用** で、分類にも推薦にも使わない。
	`job_title` text DEFAULT '' NOT NULL,
	-- カードと詳細の大見出しに出る 1 文 (80 字まで)。
	`quote` text DEFAULT '' NOT NULL,
	-- 4 章の本文 (JSON: {orderReason, struggle, currentWork, message} 各 2000 字まで)。
	-- 既定値は **4 キーを展開した空章** — schema.ts の `json(..., EMPTY_HOF_CHAPTERS)` と
	-- 同じ形にしておく。`'{}'` にすると、SQL で直接入れた行だけ章のキーが欠けた JSON に
	-- なり、DB の既定値と ORM の既定値が食い違う (読み出しは正規化で救えるが、
	-- 「既定値がどちらなのか」を 2 箇所に持つこと自体が食い違いの種になる)。
	`chapters` text DEFAULT '{"orderReason":"","struggle":"","currentWork":"","message":""}' NOT NULL,
	-- **公開した時点の**クリア済みステージ (JSON: [{id,title}])。サーバが公開時に作る。
	-- 参照ではなく写しにするのは、あとから教材の改名・非公開が起きても、公開したときの
	-- 「歩んだ道」がそのまま残るようにするため (掲載は本人が同意した時点の姿で固定する)。
	`path_snapshot` text DEFAULT '[]' NOT NULL,
	`nominated_by` text,
	`nominated_at` integer NOT NULL,
	`submitted_at` integer,
	`published_by` text,
	`published_at` integer,
	-- 辞退 / 取り下げ / 非公開化で降りた時刻。
	`closed_at` integer,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
-- 1 人につき 1 つ。推薦の重複 (409) の判定先でもある。
CREATE UNIQUE INDEX `hall_of_fame_user_uq` ON `hall_of_fame_entries` (`tenant_id`,`user_id`);--> statement-breakpoint
-- 公開一覧は「テナント × published を新着順」で引く。
CREATE INDEX `hall_of_fame_status_idx` ON `hall_of_fame_entries` (`tenant_id`,`status`,`published_at`);
