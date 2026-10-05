-- SQLite は外部キーの子側に索引を作らない。親を 1 行消すたびに子表を全走査し、
-- 教材 seed のクイズ削除と、レッスン / クイズを id 以外で引く API が D1 の行読み取りを膨らませる。
CREATE INDEX `sections_stage_id_idx` ON `sections` (`stage_id`);
--> statement-breakpoint
CREATE INDEX `lessons_section_id_idx` ON `lessons` (`section_id`);
--> statement-breakpoint
CREATE INDEX `lesson_materials_lesson_id_idx` ON `lesson_materials` (`lesson_id`);
--> statement-breakpoint
CREATE INDEX `quizzes_lesson_id_idx` ON `quizzes` (`lesson_id`);
--> statement-breakpoint
CREATE INDEX `quiz_questions_quiz_id_idx` ON `quiz_questions` (`quiz_id`);
--> statement-breakpoint
CREATE INDEX `quiz_options_question_id_idx` ON `quiz_options` (`question_id`);
--> statement-breakpoint
CREATE INDEX `review_cards_question_id_idx` ON `review_cards` (`question_id`);
