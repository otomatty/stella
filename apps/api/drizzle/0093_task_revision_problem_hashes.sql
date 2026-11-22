ALTER TABLE `task_revisions` ADD `problem_hashes` text;
--> statement-breakpoint
-- 提出と同じトランザクションで、問題合格イベントに直接依存を写す。
ALTER TABLE `task_problem_results` ADD `problem_dependencies` text;
--> statement-breakpoint
ALTER TABLE `integration_events` ADD `problem_dependencies` text;
--> statement-breakpoint
DROP TRIGGER integration_problem_passed_insert;
--> statement-breakpoint
DROP TRIGGER integration_problem_passed_update;
--> statement-breakpoint
CREATE TRIGGER integration_problem_passed_insert AFTER INSERT ON task_problem_results
WHEN EXISTS (SELECT 1 FROM integration_group_members m WHERE m.profile_id = NEW.user_id)
BEGIN
INSERT OR IGNORE INTO integration_events(id,type,occurred_at,user_id,stage_id,task_id,source,problem_id,content_hash,problem_dependencies)
SELECT json_array('problem',NEW.user_id,NEW.task_id,NEW.problem_id,NEW.content_hash,NEW.source,NEW.first_passed_at,(SELECT coalesce(max(seq),0)+1 FROM integration_events)),
  'problem_passed',NEW.first_passed_at,NEW.user_id,u.stage_id,t.id,NEW.source,NEW.problem_id,NEW.content_hash,NEW.problem_dependencies
FROM tasks t JOIN sections u ON u.id=t.section_id WHERE t.id=NEW.task_id;
END;
--> statement-breakpoint
CREATE TRIGGER integration_problem_passed_update AFTER UPDATE ON task_problem_results
WHEN EXISTS (SELECT 1 FROM integration_group_members m WHERE m.profile_id = NEW.user_id)
  AND (OLD.content_hash<>NEW.content_hash OR OLD.source<>NEW.source OR OLD.first_passed_at<>NEW.first_passed_at
    OR OLD.problem_dependencies IS NOT NEW.problem_dependencies)
BEGIN
INSERT OR IGNORE INTO integration_events(id,type,occurred_at,user_id,stage_id,task_id,source,problem_id,content_hash,problem_dependencies)
SELECT json_array('problem',NEW.user_id,NEW.task_id,NEW.problem_id,NEW.content_hash,NEW.source,NEW.updated_at,(SELECT coalesce(max(seq),0)+1 FROM integration_events)),
  'problem_passed',NEW.updated_at,NEW.user_id,u.stage_id,t.id,NEW.source,NEW.problem_id,NEW.content_hash,NEW.problem_dependencies
FROM tasks t JOIN sections u ON u.id=t.section_id WHERE t.id=NEW.task_id;
END;
