-- 読み取りの位置を安定させる、内容を持たない出来事の索引。
-- 既存の更新と同じトランザクションで、いずれかの連携グループにいる人だけ記録する。
-- 後から参加した人の過去分は取り込まない。更新トリガーも出来事の変更時だけ記録する。
CREATE TABLE integration_events (
  seq integer PRIMARY KEY AUTOINCREMENT,
  id text NOT NULL UNIQUE,
  type text NOT NULL,
  occurred_at integer NOT NULL,
  user_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stage_id text NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
  task_id text REFERENCES tasks(id) ON DELETE CASCADE,
  submission_id text,
  source text,
  submission_attempt integer NOT NULL DEFAULT 1,
  reason text,
  problem_id text,
  content_hash text
);
CREATE INDEX integration_events_position_idx ON integration_events(occurred_at, id);
CREATE INDEX integration_events_scope_idx ON integration_events(user_id, stage_id, occurred_at);
CREATE INDEX integration_events_problem_idx ON integration_events(user_id, task_id, problem_id, content_hash, source, occurred_at);
INSERT OR IGNORE INTO integration_events(id,type,occurred_at,user_id,stage_id) SELECT json_array('stage_started',id,enrolled_at),'stage_started',enrolled_at,user_id,stage_id FROM enrollments WHERE enrolled_at IS NOT NULL AND EXISTS (SELECT 1 FROM integration_group_members m WHERE m.profile_id = enrollments.user_id);
CREATE TRIGGER integration_stage_started_insert AFTER INSERT ON enrollments WHEN EXISTS (SELECT 1 FROM integration_group_members m WHERE m.profile_id = NEW.user_id) AND (NEW.enrolled_at IS NOT NULL) BEGIN
INSERT OR IGNORE INTO integration_events(id,type,occurred_at,user_id,stage_id) SELECT json_array('stage_started',NEW.id,NEW.enrolled_at),'stage_started',NEW.enrolled_at,NEW.user_id,NEW.stage_id;
END;
CREATE TRIGGER integration_stage_started_update AFTER UPDATE ON enrollments WHEN EXISTS (SELECT 1 FROM integration_group_members m WHERE m.profile_id = NEW.user_id) AND (NEW.enrolled_at IS NOT NULL) AND NEW.enrolled_at IS NOT OLD.enrolled_at BEGIN
INSERT OR IGNORE INTO integration_events(id,type,occurred_at,user_id,stage_id) SELECT json_array('stage_started',NEW.id,NEW.enrolled_at),'stage_started',NEW.enrolled_at,NEW.user_id,NEW.stage_id;
END;
INSERT OR IGNORE INTO integration_events(id,type,occurred_at,user_id,stage_id) SELECT json_array('stage_cleared',id,completed_at),'stage_cleared',completed_at,user_id,stage_id FROM enrollments WHERE completed_at IS NOT NULL AND EXISTS (SELECT 1 FROM integration_group_members m WHERE m.profile_id = enrollments.user_id);
CREATE TRIGGER integration_stage_cleared_insert AFTER INSERT ON enrollments WHEN EXISTS (SELECT 1 FROM integration_group_members m WHERE m.profile_id = NEW.user_id) AND (NEW.completed_at IS NOT NULL) BEGIN
INSERT OR IGNORE INTO integration_events(id,type,occurred_at,user_id,stage_id) SELECT json_array('stage_cleared',NEW.id,NEW.completed_at),'stage_cleared',NEW.completed_at,NEW.user_id,NEW.stage_id;
END;
CREATE TRIGGER integration_stage_cleared_update AFTER UPDATE ON enrollments WHEN EXISTS (SELECT 1 FROM integration_group_members m WHERE m.profile_id = NEW.user_id) AND (NEW.completed_at IS NOT NULL) AND NEW.completed_at IS NOT OLD.completed_at BEGIN
INSERT OR IGNORE INTO integration_events(id,type,occurred_at,user_id,stage_id) SELECT json_array('stage_cleared',NEW.id,NEW.completed_at),'stage_cleared',NEW.completed_at,NEW.user_id,NEW.stage_id;
END;
INSERT OR IGNORE INTO integration_events(id,type,occurred_at,user_id,stage_id,task_id,submission_id,source,submission_attempt) SELECT json_array('task_passed',x.id,x.reviewed_at,x.review_source),'task_passed',x.reviewed_at,x.student_id,u.stage_id,t.id,x.id,x.review_source,x.attempt FROM submissions x JOIN tasks t ON t.id=x.task_id JOIN sections u ON u.id=t.section_id WHERE x.verdict='pass' AND x.reviewed_at IS NOT NULL AND x.student_id IN (SELECT id FROM profiles) AND EXISTS (SELECT 1 FROM integration_group_members m WHERE m.profile_id = x.student_id);
CREATE TRIGGER integration_task_passed_insert AFTER INSERT ON submissions WHEN EXISTS (SELECT 1 FROM integration_group_members m WHERE m.profile_id = NEW.student_id) AND (NEW.verdict='pass' AND NEW.reviewed_at IS NOT NULL AND NEW.student_id IN (SELECT id FROM profiles)) BEGIN
INSERT OR IGNORE INTO integration_events(id,type,occurred_at,user_id,stage_id,task_id,submission_id,source,submission_attempt) SELECT json_array('task_passed',NEW.id,NEW.reviewed_at,NEW.review_source,(SELECT coalesce(max(seq),0)+1 FROM integration_events)),'task_passed',NEW.reviewed_at,NEW.student_id,u.stage_id,t.id,NEW.id,NEW.review_source,NEW.attempt FROM tasks t JOIN sections u ON u.id=t.section_id WHERE t.id=NEW.task_id;
END;
CREATE TRIGGER integration_task_passed_update AFTER UPDATE ON submissions WHEN EXISTS (SELECT 1 FROM integration_group_members m WHERE m.profile_id = NEW.student_id) AND (NEW.verdict='pass' AND NEW.reviewed_at IS NOT NULL AND NEW.student_id IN (SELECT id FROM profiles)) AND (NEW.verdict IS NOT OLD.verdict OR NEW.reviewed_at IS NOT OLD.reviewed_at OR NEW.review_source IS NOT OLD.review_source) BEGIN
INSERT OR IGNORE INTO integration_events(id,type,occurred_at,user_id,stage_id,task_id,submission_id,source,submission_attempt) SELECT json_array('task_passed',NEW.id,NEW.reviewed_at,NEW.review_source,(SELECT coalesce(max(seq),0)+1 FROM integration_events)),'task_passed',NEW.reviewed_at,NEW.student_id,u.stage_id,t.id,NEW.id,NEW.review_source,NEW.attempt FROM tasks t JOIN sections u ON u.id=t.section_id WHERE t.id=NEW.task_id;
END;
INSERT OR IGNORE INTO integration_events(id,type,occurred_at,user_id,stage_id,task_id,submission_id,source,submission_attempt) SELECT json_array('task_returned',x.id,x.reviewed_at),'task_returned',x.reviewed_at,x.student_id,u.stage_id,t.id,x.id,x.review_source,x.attempt FROM submissions x JOIN tasks t ON t.id=x.task_id JOIN sections u ON u.id=t.section_id WHERE x.verdict='resubmit' AND x.reviewed_at IS NOT NULL AND x.student_id IN (SELECT id FROM profiles) AND EXISTS (SELECT 1 FROM integration_group_members m WHERE m.profile_id = x.student_id);
CREATE TRIGGER integration_task_returned_insert AFTER INSERT ON submissions WHEN EXISTS (SELECT 1 FROM integration_group_members m WHERE m.profile_id = NEW.student_id) AND (NEW.verdict='resubmit' AND NEW.reviewed_at IS NOT NULL AND NEW.student_id IN (SELECT id FROM profiles)) BEGIN
INSERT OR IGNORE INTO integration_events(id,type,occurred_at,user_id,stage_id,task_id,submission_id,source,submission_attempt) SELECT json_array('task_returned',NEW.id,NEW.reviewed_at),'task_returned',NEW.reviewed_at,NEW.student_id,u.stage_id,t.id,NEW.id,NEW.review_source,NEW.attempt FROM tasks t JOIN sections u ON u.id=t.section_id WHERE t.id=NEW.task_id;
END;
CREATE TRIGGER integration_task_returned_update AFTER UPDATE ON submissions WHEN EXISTS (SELECT 1 FROM integration_group_members m WHERE m.profile_id = NEW.student_id) AND (NEW.verdict='resubmit' AND NEW.reviewed_at IS NOT NULL AND NEW.student_id IN (SELECT id FROM profiles)) AND (NEW.verdict IS NOT OLD.verdict OR NEW.reviewed_at IS NOT OLD.reviewed_at OR NEW.review_source IS NOT OLD.review_source) AND OLD.verdict IS NOT 'pass' BEGIN
INSERT OR IGNORE INTO integration_events(id,type,occurred_at,user_id,stage_id,task_id,submission_id,source,submission_attempt) SELECT json_array('task_returned',NEW.id,NEW.reviewed_at),'task_returned',NEW.reviewed_at,NEW.student_id,u.stage_id,t.id,NEW.id,NEW.review_source,NEW.attempt FROM tasks t JOIN sections u ON u.id=t.section_id WHERE t.id=NEW.task_id;
END;
INSERT OR IGNORE INTO integration_events(id,type,occurred_at,user_id,stage_id,task_id,source,problem_id,content_hash)
SELECT json_array('problem',r.user_id,r.task_id,r.problem_id,r.content_hash,r.source,r.first_passed_at),'problem_passed',r.first_passed_at,r.user_id,u.stage_id,t.id,r.source,r.problem_id,r.content_hash FROM task_problem_results r JOIN tasks t ON t.id=r.task_id JOIN sections u ON u.id=t.section_id WHERE EXISTS (SELECT 1 FROM integration_group_members m WHERE m.profile_id = r.user_id);
CREATE TRIGGER integration_problem_passed_insert AFTER INSERT ON task_problem_results WHEN EXISTS (SELECT 1 FROM integration_group_members m WHERE m.profile_id = NEW.user_id) BEGIN
INSERT OR IGNORE INTO integration_events(id,type,occurred_at,user_id,stage_id,task_id,source,problem_id,content_hash)
SELECT json_array('problem',NEW.user_id,NEW.task_id,NEW.problem_id,NEW.content_hash,NEW.source,NEW.first_passed_at,(SELECT coalesce(max(seq),0)+1 FROM integration_events)),'problem_passed',NEW.first_passed_at,NEW.user_id,u.stage_id,t.id,NEW.source,NEW.problem_id,NEW.content_hash FROM tasks t JOIN sections u ON u.id=t.section_id WHERE t.id=NEW.task_id;
END;
CREATE TRIGGER integration_problem_passed_update AFTER UPDATE ON task_problem_results WHEN EXISTS (SELECT 1 FROM integration_group_members m WHERE m.profile_id = NEW.user_id) AND (OLD.content_hash<>NEW.content_hash OR OLD.source<>NEW.source OR OLD.first_passed_at<>NEW.first_passed_at) BEGIN
INSERT OR IGNORE INTO integration_events(id,type,occurred_at,user_id,stage_id,task_id,source,problem_id,content_hash)
SELECT json_array('problem',NEW.user_id,NEW.task_id,NEW.problem_id,NEW.content_hash,NEW.source,NEW.updated_at,(SELECT coalesce(max(seq),0)+1 FROM integration_events)),'problem_passed',NEW.updated_at,NEW.user_id,u.stage_id,t.id,NEW.source,NEW.problem_id,NEW.content_hash FROM tasks t JOIN sections u ON u.id=t.section_id WHERE t.id=NEW.task_id;
END;

-- 判定の取り消しは提出単位。再提出の案内とは二重に記録しない。
CREATE TRIGGER integration_task_pass_revoked_update AFTER UPDATE ON submissions
WHEN OLD.verdict='pass' AND NEW.verdict IS NOT 'pass'
  AND EXISTS (SELECT 1 FROM integration_group_members m WHERE m.profile_id = NEW.student_id)
BEGIN
INSERT INTO integration_events(id,type,occurred_at,user_id,stage_id,task_id,submission_id,source,submission_attempt,reason)
SELECT lower(hex(randomblob(16))),'task_pass_revoked',coalesce(NEW.reviewed_at,(CAST(strftime('%s','now') AS INTEGER) * 1000 + CAST(substr(strftime('%f','now'),4,3) AS INTEGER))),NEW.student_id,u.stage_id,t.id,NEW.id,NEW.review_source,NEW.attempt,
  CASE WHEN NEW.verdict='resubmit' THEN 'resubmit' WHEN NEW.verdict='fail' THEN 'fail' ELSE 'removed' END
FROM tasks t JOIN sections u ON u.id=t.section_id WHERE t.id=NEW.task_id;
END;
CREATE TRIGGER integration_task_pass_revoked_delete AFTER DELETE ON submissions
WHEN OLD.verdict='pass'
  AND EXISTS (SELECT 1 FROM integration_group_members m WHERE m.profile_id = OLD.student_id)
  AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = OLD.student_id)
BEGIN
INSERT INTO integration_events(id,type,occurred_at,user_id,stage_id,task_id,submission_id,source,submission_attempt,reason)
SELECT lower(hex(randomblob(16))),'task_pass_revoked',(CAST(strftime('%s','now') AS INTEGER) * 1000 + CAST(substr(strftime('%f','now'),4,3) AS INTEGER)),OLD.student_id,u.stage_id,t.id,OLD.id,OLD.review_source,OLD.attempt,'removed'
FROM tasks t JOIN sections u ON u.id=t.section_id JOIN stages s ON s.id=u.stage_id WHERE t.id=OLD.task_id;
END;
-- 結果の行は版を更新して使うため、削除時には記録済みの各版の合格も失効させる。
CREATE TRIGGER integration_problem_pass_revoked_delete AFTER DELETE ON task_problem_results
WHEN EXISTS (SELECT 1 FROM integration_group_members m WHERE m.profile_id = OLD.user_id)
  AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = OLD.user_id)
BEGIN
INSERT INTO integration_events(id,type,occurred_at,user_id,stage_id,task_id,source,problem_id,content_hash)
SELECT lower(hex(randomblob(16))),'problem_pass_revoked',(CAST(strftime('%s','now') AS INTEGER) * 1000 + CAST(substr(strftime('%f','now'),4,3) AS INTEGER)),OLD.user_id,u.stage_id,t.id,OLD.source,OLD.problem_id,v.content_hash
FROM tasks t JOIN sections u ON u.id=t.section_id JOIN stages s ON s.id=u.stage_id
JOIN (SELECT OLD.content_hash content_hash UNION SELECT content_hash FROM integration_events
  WHERE user_id=OLD.user_id AND task_id=OLD.task_id AND problem_id=OLD.problem_id AND type='problem_passed') v
WHERE t.id=OLD.task_id;
END;
