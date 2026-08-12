-- Remove Q&A notification rows before dropping Q&A tables.
DELETE FROM `notifications` WHERE `type` = 'qa_answered';--> statement-breakpoint
DROP TABLE `question_replies`;--> statement-breakpoint
DROP TABLE `questions`;--> statement-breakpoint
DROP TABLE `lesson_notes`;
