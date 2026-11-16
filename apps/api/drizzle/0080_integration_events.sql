-- 読み取りの位置を安定させる、内容を持たない出来事の索引。
-- 既存の更新と同じトランザクションのトリガーで記録する。
CREATE TABLE integration_events (
  id text PRIMARY KEY NOT NULL,
  type text NOT NULL,
  occurred_at integer NOT NULL,
  user_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stage_id text NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
  task_id text REFERENCES tasks(id) ON DELETE CASCADE,
  submission_id text,
  source text,
  problem_id text,
  content_hash text
);
CREATE INDEX integration_events_position_idx ON integration_events(occurred_at, id);
CREATE INDEX integration_events_scope_idx ON integration_events(user_id, stage_id, occurred_at);
CREATE INDEX integration_events_problem_idx ON integration_events(user_id, task_id, problem_id, content_hash, source, occurred_at);
INSERT OR IGNORE INTO integration_events(id,type,occurred_at,user_id,stage_id) SELECT json_array('stage_started',id,enrolled_at),'stage_started',enrolled_at,user_id,stage_id FROM enrollments WHERE enrolled_at IS NOT NULL;
CREATE TRIGGER integration_stage_started_insert AFTER INSERT ON enrollments WHEN NEW.enrolled_at IS NOT NULL BEGIN
INSERT OR IGNORE INTO integration_events(id,type,occurred_at,user_id,stage_id) SELECT json_array('stage_started',NEW.id,NEW.enrolled_at),'stage_started',NEW.enrolled_at,NEW.user_id,NEW.stage_id;
END;
CREATE TRIGGER integration_stage_started_update AFTER UPDATE ON enrollments WHEN NEW.enrolled_at IS NOT NULL BEGIN
INSERT OR IGNORE INTO integration_events(id,type,occurred_at,user_id,stage_id) SELECT json_array('stage_started',NEW.id,NEW.enrolled_at),'stage_started',NEW.enrolled_at,NEW.user_id,NEW.stage_id;
END;
INSERT OR IGNORE INTO integration_events(id,type,occurred_at,user_id,stage_id) SELECT json_array('stage_cleared',id,completed_at),'stage_cleared',completed_at,user_id,stage_id FROM enrollments WHERE completed_at IS NOT NULL;
CREATE TRIGGER integration_stage_cleared_insert AFTER INSERT ON enrollments WHEN NEW.completed_at IS NOT NULL BEGIN
INSERT OR IGNORE INTO integration_events(id,type,occurred_at,user_id,stage_id) SELECT json_array('stage_cleared',NEW.id,NEW.completed_at),'stage_cleared',NEW.completed_at,NEW.user_id,NEW.stage_id;
END;
CREATE TRIGGER integration_stage_cleared_update AFTER UPDATE ON enrollments WHEN NEW.completed_at IS NOT NULL BEGIN
INSERT OR IGNORE INTO integration_events(id,type,occurred_at,user_id,stage_id) SELECT json_array('stage_cleared',NEW.id,NEW.completed_at),'stage_cleared',NEW.completed_at,NEW.user_id,NEW.stage_id;
END;
INSERT OR IGNORE INTO integration_events(id,type,occurred_at,user_id,stage_id,task_id,submission_id,source) SELECT json_array('task_passed',x.id,x.reviewed_at,x.review_source),'task_passed',x.reviewed_at,x.student_id,u.stage_id,t.id,x.id,x.review_source FROM submissions x JOIN tasks t ON t.id=x.task_id JOIN sections u ON u.id=t.section_id WHERE x.verdict='pass' AND x.reviewed_at IS NOT NULL AND x.student_id IN (SELECT id FROM profiles);
CREATE TRIGGER integration_task_passed_insert AFTER INSERT ON submissions WHEN NEW.verdict='pass' AND NEW.reviewed_at IS NOT NULL AND NEW.student_id IN (SELECT id FROM profiles) BEGIN
INSERT OR IGNORE INTO integration_events(id,type,occurred_at,user_id,stage_id,task_id,submission_id,source) SELECT json_array('task_passed',NEW.id,NEW.reviewed_at,NEW.review_source),'task_passed',NEW.reviewed_at,NEW.student_id,u.stage_id,t.id,NEW.id,NEW.review_source FROM tasks t JOIN sections u ON u.id=t.section_id WHERE t.id=NEW.task_id;
END;
CREATE TRIGGER integration_task_passed_update AFTER UPDATE ON submissions WHEN NEW.verdict='pass' AND NEW.reviewed_at IS NOT NULL AND NEW.student_id IN (SELECT id FROM profiles) BEGIN
INSERT OR IGNORE INTO integration_events(id,type,occurred_at,user_id,stage_id,task_id,submission_id,source) SELECT json_array('task_passed',NEW.id,NEW.reviewed_at,NEW.review_source),'task_passed',NEW.reviewed_at,NEW.student_id,u.stage_id,t.id,NEW.id,NEW.review_source FROM tasks t JOIN sections u ON u.id=t.section_id WHERE t.id=NEW.task_id;
END;
INSERT OR IGNORE INTO integration_events(id,type,occurred_at,user_id,stage_id,task_id,submission_id,source) SELECT json_array('task_returned',x.id,x.reviewed_at),'task_returned',x.reviewed_at,x.student_id,u.stage_id,t.id,x.id,x.review_source FROM submissions x JOIN tasks t ON t.id=x.task_id JOIN sections u ON u.id=t.section_id WHERE x.verdict='resubmit' AND x.reviewed_at IS NOT NULL AND x.student_id IN (SELECT id FROM profiles);
CREATE TRIGGER integration_task_returned_insert AFTER INSERT ON submissions WHEN NEW.verdict='resubmit' AND NEW.reviewed_at IS NOT NULL AND NEW.student_id IN (SELECT id FROM profiles) BEGIN
INSERT OR IGNORE INTO integration_events(id,type,occurred_at,user_id,stage_id,task_id,submission_id,source) SELECT json_array('task_returned',NEW.id,NEW.reviewed_at),'task_returned',NEW.reviewed_at,NEW.student_id,u.stage_id,t.id,NEW.id,NEW.review_source FROM tasks t JOIN sections u ON u.id=t.section_id WHERE t.id=NEW.task_id;
END;
CREATE TRIGGER integration_task_returned_update AFTER UPDATE ON submissions WHEN NEW.verdict='resubmit' AND NEW.reviewed_at IS NOT NULL AND NEW.student_id IN (SELECT id FROM profiles) BEGIN
INSERT OR IGNORE INTO integration_events(id,type,occurred_at,user_id,stage_id,task_id,submission_id,source) SELECT json_array('task_returned',NEW.id,NEW.reviewed_at),'task_returned',NEW.reviewed_at,NEW.student_id,u.stage_id,t.id,NEW.id,NEW.review_source FROM tasks t JOIN sections u ON u.id=t.section_id WHERE t.id=NEW.task_id;
END;
INSERT OR IGNORE INTO integration_events(id,type,occurred_at,user_id,stage_id,task_id,source,problem_id,content_hash)
SELECT json_array('problem',r.user_id,r.task_id,r.problem_id,r.content_hash,r.source,r.first_passed_at),'problem_passed',r.first_passed_at,r.user_id,u.stage_id,t.id,r.source,r.problem_id,r.content_hash FROM task_problem_results r JOIN tasks t ON t.id=r.task_id JOIN sections u ON u.id=t.section_id;
CREATE TRIGGER integration_problem_passed_insert AFTER INSERT ON task_problem_results BEGIN
INSERT OR IGNORE INTO integration_events(id,type,occurred_at,user_id,stage_id,task_id,source,problem_id,content_hash)
SELECT json_array('problem',NEW.user_id,NEW.task_id,NEW.problem_id,NEW.content_hash,NEW.source,NEW.first_passed_at),'problem_passed',NEW.first_passed_at,NEW.user_id,u.stage_id,t.id,NEW.source,NEW.problem_id,NEW.content_hash FROM tasks t JOIN sections u ON u.id=t.section_id WHERE t.id=NEW.task_id;
END;
CREATE TRIGGER integration_problem_passed_update AFTER UPDATE ON task_problem_results WHEN OLD.content_hash<>NEW.content_hash OR OLD.source<>NEW.source OR OLD.first_passed_at<>NEW.first_passed_at BEGIN
INSERT OR IGNORE INTO integration_events(id,type,occurred_at,user_id,stage_id,task_id,source,problem_id,content_hash)
SELECT json_array('problem',NEW.user_id,NEW.task_id,NEW.problem_id,NEW.content_hash,NEW.source,NEW.updated_at),'problem_passed',NEW.updated_at,NEW.user_id,u.stage_id,t.id,NEW.source,NEW.problem_id,NEW.content_hash FROM tasks t JOIN sections u ON u.id=t.section_id WHERE t.id=NEW.task_id;
END;
