-- Issue #237 — 想定質問の手動編集 (admin / sales)。
--
-- edited_at が入っている行は「人が直した行」。 seed (questions.json が正本) の upsert は
-- この列を見て上書きを避ける — そうしないと main への push ごとに現場の修正が消える。
ALTER TABLE `interview_questions` ADD `edited_at` integer;--> statement-breakpoint
ALTER TABLE `interview_questions` ADD `edited_by` text;
