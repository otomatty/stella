-- 所属と設定を移し、実効の割り当てと免除はビューで求める。
CREATE TABLE groups (
  id text PRIMARY KEY NOT NULL,
  name text NOT NULL,
  client_id text REFERENCES integration_clients(id) ON DELETE CASCADE,
  external_key text CONSTRAINT groups_external_key_check CHECK (length(external_key) BETWEEN 1 AND 100 AND external_key NOT GLOB '*[^A-Za-z0-9:_-]*'),
  share_progress integer NOT NULL DEFAULT 0 CONSTRAINT groups_share_progress_check CHECK (share_progress IN (0, 1)),
  created_by text REFERENCES profiles(id) ON DELETE SET NULL,
  created_at integer NOT NULL,
  updated_at integer NOT NULL,
  CONSTRAINT groups_client_external_key_pair CHECK ((client_id IS NULL) = (external_key IS NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX groups_client_key ON groups(client_id, external_key);
--> statement-breakpoint
CREATE TABLE group_members (
  group_id text NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  profile_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  external_id text,
  peer_name text CONSTRAINT group_members_peer_name_check CHECK (length(peer_name) BETWEEN 1 AND 50),
  joined_at integer NOT NULL,
  PRIMARY KEY (group_id, profile_id)
);
--> statement-breakpoint
CREATE INDEX group_members_profile ON group_members(profile_id);
--> statement-breakpoint
CREATE UNIQUE INDEX group_members_external_unique ON group_members(group_id, external_id);
--> statement-breakpoint
CREATE TABLE group_stages (
  group_id text NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  stage_id text NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
  due_at text,
  message text,
  exempt integer NOT NULL DEFAULT 0 CONSTRAINT group_stages_exempt_check CHECK (exempt IN (0, 1)),
  PRIMARY KEY (group_id, stage_id)
);
--> statement-breakpoint
INSERT INTO groups (id, name, client_id, external_key, created_at, updated_at)
SELECT id, name, client_id, external_key, created_at, updated_at FROM integration_groups;
--> statement-breakpoint
INSERT INTO group_members (group_id, profile_id, external_id, joined_at)
SELECT group_id, profile_id, external_id, joined_at FROM integration_group_members;
--> statement-breakpoint
INSERT INTO group_stages (group_id, stage_id, due_at, message, exempt)
SELECT group_id, stage_id, due_at, message, exempt FROM integration_group_stages;
--> statement-breakpoint
DELETE FROM stage_unlocks WHERE source_group_id IS NOT NULL;
--> statement-breakpoint
DELETE FROM stage_grants WHERE source_group_id IS NOT NULL;
--> statement-breakpoint
-- どちらの表も他の表から参照されていないため、外部キーを有効にしたまま置き換える。
CREATE TABLE new_stage_grants (
  id text PRIMARY KEY NOT NULL,
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  stage_id text NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
  profile_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  granted_by text,
  granted_at integer NOT NULL,
  source_name text,
  due_at text,
  message text
);
--> statement-breakpoint
INSERT INTO new_stage_grants
SELECT id, tenant_id, stage_id, profile_id, granted_by, granted_at, source_name, due_at, message
FROM stage_grants;
--> statement-breakpoint
DROP TABLE stage_grants;
--> statement-breakpoint
ALTER TABLE new_stage_grants RENAME TO stage_grants;
--> statement-breakpoint
CREATE UNIQUE INDEX stage_grants_stage_profile_uq ON stage_grants(stage_id, profile_id);
--> statement-breakpoint
CREATE INDEX stage_grants_profile_idx ON stage_grants(profile_id);
--> statement-breakpoint
CREATE TABLE new_stage_unlocks (
  id text PRIMARY KEY NOT NULL,
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stage_id text NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
  via text DEFAULT 'skill_check' NOT NULL,
  unlocked_at integer NOT NULL
);
--> statement-breakpoint
INSERT INTO new_stage_unlocks
SELECT id, tenant_id, user_id, stage_id, via, unlocked_at FROM stage_unlocks;
--> statement-breakpoint
DROP TABLE stage_unlocks;
--> statement-breakpoint
ALTER TABLE new_stage_unlocks RENAME TO stage_unlocks;
--> statement-breakpoint
CREATE UNIQUE INDEX stage_unlocks_user_stage_uq ON stage_unlocks(user_id, stage_id);
--> statement-breakpoint
DROP TRIGGER integration_stage_started_insert;
--> statement-breakpoint
DROP TRIGGER integration_stage_started_update;
--> statement-breakpoint
DROP TRIGGER integration_stage_cleared_insert;
--> statement-breakpoint
DROP TRIGGER integration_stage_cleared_update;
--> statement-breakpoint
DROP TRIGGER integration_task_passed_insert;
--> statement-breakpoint
DROP TRIGGER integration_task_passed_update;
--> statement-breakpoint
DROP TRIGGER integration_task_returned_insert;
--> statement-breakpoint
DROP TRIGGER integration_task_returned_update;
--> statement-breakpoint
DROP TRIGGER integration_problem_passed_insert;
--> statement-breakpoint
DROP TRIGGER integration_problem_passed_update;
--> statement-breakpoint
DROP TRIGGER integration_task_pass_revoked_update;
--> statement-breakpoint
DROP TRIGGER integration_task_pass_revoked_delete;
--> statement-breakpoint
DROP TRIGGER integration_problem_pass_revoked_delete;
--> statement-breakpoint
DROP TRIGGER integration_stage_clear_revoked_update;
--> statement-breakpoint
DROP TRIGGER integration_stage_unassigned_delete;
--> statement-breakpoint
CREATE TRIGGER integration_stage_started_insert AFTER INSERT ON enrollments WHEN EXISTS (SELECT 1 FROM group_members m JOIN groups g ON g.id = m.group_id WHERE g.client_id IS NOT NULL AND m.profile_id = NEW.user_id) AND (NEW.enrolled_at IS NOT NULL) BEGIN
INSERT OR IGNORE INTO integration_events(id,type,occurred_at,user_id,stage_id) SELECT json_array('stage_started',NEW.id,NEW.enrolled_at,(SELECT coalesce(max(seq),0)+1 FROM integration_events)),'stage_started',NEW.enrolled_at,NEW.user_id,NEW.stage_id;
END;
--> statement-breakpoint
CREATE TRIGGER integration_stage_started_update AFTER UPDATE ON enrollments WHEN EXISTS (SELECT 1 FROM group_members m JOIN groups g ON g.id = m.group_id WHERE g.client_id IS NOT NULL AND m.profile_id = NEW.user_id) AND (NEW.enrolled_at IS NOT NULL) AND NEW.enrolled_at IS NOT OLD.enrolled_at BEGIN
INSERT OR IGNORE INTO integration_events(id,type,occurred_at,user_id,stage_id) SELECT json_array('stage_started',NEW.id,NEW.enrolled_at,(SELECT coalesce(max(seq),0)+1 FROM integration_events)),'stage_started',NEW.enrolled_at,NEW.user_id,NEW.stage_id;
END;
--> statement-breakpoint
CREATE TRIGGER integration_stage_cleared_insert AFTER INSERT ON enrollments WHEN EXISTS (SELECT 1 FROM group_members m JOIN groups g ON g.id = m.group_id WHERE g.client_id IS NOT NULL AND m.profile_id = NEW.user_id) AND (NEW.completed_at IS NOT NULL) BEGIN
INSERT OR IGNORE INTO integration_events(id,type,occurred_at,user_id,stage_id) SELECT json_array('stage_cleared',NEW.id,NEW.completed_at,(SELECT coalesce(max(seq),0)+1 FROM integration_events)),'stage_cleared',NEW.completed_at,NEW.user_id,NEW.stage_id;
END;
--> statement-breakpoint
CREATE TRIGGER integration_stage_cleared_update AFTER UPDATE ON enrollments WHEN EXISTS (SELECT 1 FROM group_members m JOIN groups g ON g.id = m.group_id WHERE g.client_id IS NOT NULL AND m.profile_id = NEW.user_id) AND (NEW.completed_at IS NOT NULL) AND NEW.completed_at IS NOT OLD.completed_at BEGIN
INSERT OR IGNORE INTO integration_events(id,type,occurred_at,user_id,stage_id) SELECT json_array('stage_cleared',NEW.id,NEW.completed_at,(SELECT coalesce(max(seq),0)+1 FROM integration_events)),'stage_cleared',NEW.completed_at,NEW.user_id,NEW.stage_id;
END;
--> statement-breakpoint
CREATE TRIGGER integration_task_passed_insert AFTER INSERT ON submissions WHEN EXISTS (SELECT 1 FROM group_members m JOIN groups g ON g.id = m.group_id WHERE g.client_id IS NOT NULL AND m.profile_id = NEW.student_id) AND (NEW.verdict='pass' AND NEW.reviewed_at IS NOT NULL AND NEW.student_id IN (SELECT id FROM profiles)) BEGIN
INSERT OR IGNORE INTO integration_events(id,type,occurred_at,user_id,stage_id,task_id,submission_id,source,submission_attempt) SELECT json_array('task_passed',NEW.id,NEW.reviewed_at,NEW.review_source,(SELECT coalesce(max(seq),0)+1 FROM integration_events)),'task_passed',NEW.reviewed_at,NEW.student_id,u.stage_id,t.id,NEW.id,NEW.review_source,NEW.attempt FROM tasks t JOIN sections u ON u.id=t.section_id WHERE t.id=NEW.task_id;
END;
--> statement-breakpoint
CREATE TRIGGER integration_task_passed_update AFTER UPDATE ON submissions WHEN EXISTS (SELECT 1 FROM group_members m JOIN groups g ON g.id = m.group_id WHERE g.client_id IS NOT NULL AND m.profile_id = NEW.student_id) AND (NEW.verdict='pass' AND NEW.reviewed_at IS NOT NULL AND NEW.student_id IN (SELECT id FROM profiles)) AND (NEW.verdict IS NOT OLD.verdict OR NEW.reviewed_at IS NOT OLD.reviewed_at OR NEW.review_source IS NOT OLD.review_source) BEGIN
INSERT OR IGNORE INTO integration_events(id,type,occurred_at,user_id,stage_id,task_id,submission_id,source,submission_attempt) SELECT json_array('task_passed',NEW.id,NEW.reviewed_at,NEW.review_source,(SELECT coalesce(max(seq),0)+1 FROM integration_events)),'task_passed',NEW.reviewed_at,NEW.student_id,u.stage_id,t.id,NEW.id,NEW.review_source,NEW.attempt FROM tasks t JOIN sections u ON u.id=t.section_id WHERE t.id=NEW.task_id;
END;
--> statement-breakpoint
CREATE TRIGGER integration_task_returned_insert AFTER INSERT ON submissions WHEN EXISTS (SELECT 1 FROM group_members m JOIN groups g ON g.id = m.group_id WHERE g.client_id IS NOT NULL AND m.profile_id = NEW.student_id) AND (NEW.verdict='resubmit' AND NEW.reviewed_at IS NOT NULL AND NEW.student_id IN (SELECT id FROM profiles)) BEGIN
INSERT OR IGNORE INTO integration_events(id,type,occurred_at,user_id,stage_id,task_id,submission_id,source,submission_attempt) SELECT json_array('task_returned',NEW.id,NEW.reviewed_at),'task_returned',NEW.reviewed_at,NEW.student_id,u.stage_id,t.id,NEW.id,NEW.review_source,NEW.attempt FROM tasks t JOIN sections u ON u.id=t.section_id WHERE t.id=NEW.task_id;
END;
--> statement-breakpoint
CREATE TRIGGER integration_task_returned_update AFTER UPDATE ON submissions WHEN EXISTS (SELECT 1 FROM group_members m JOIN groups g ON g.id = m.group_id WHERE g.client_id IS NOT NULL AND m.profile_id = NEW.student_id) AND (NEW.verdict='resubmit' AND NEW.reviewed_at IS NOT NULL AND NEW.student_id IN (SELECT id FROM profiles)) AND (NEW.verdict IS NOT OLD.verdict OR NEW.reviewed_at IS NOT OLD.reviewed_at OR NEW.review_source IS NOT OLD.review_source) AND OLD.verdict IS NOT 'pass' BEGIN
INSERT OR IGNORE INTO integration_events(id,type,occurred_at,user_id,stage_id,task_id,submission_id,source,submission_attempt) SELECT json_array('task_returned',NEW.id,NEW.reviewed_at),'task_returned',NEW.reviewed_at,NEW.student_id,u.stage_id,t.id,NEW.id,NEW.review_source,NEW.attempt FROM tasks t JOIN sections u ON u.id=t.section_id WHERE t.id=NEW.task_id;
END;
--> statement-breakpoint
CREATE TRIGGER integration_problem_passed_insert AFTER INSERT ON task_problem_results
WHEN EXISTS (SELECT 1 FROM group_members m JOIN groups g ON g.id = m.group_id WHERE g.client_id IS NOT NULL AND m.profile_id = NEW.user_id)
BEGIN
INSERT OR IGNORE INTO integration_events(id,type,occurred_at,user_id,stage_id,task_id,source,problem_id,content_hash,problem_dependencies)
SELECT json_array('problem',NEW.user_id,NEW.task_id,NEW.problem_id,NEW.content_hash,NEW.source,NEW.first_passed_at,(SELECT coalesce(max(seq),0)+1 FROM integration_events)),
  'problem_passed',NEW.first_passed_at,NEW.user_id,u.stage_id,t.id,NEW.source,NEW.problem_id,NEW.content_hash,NEW.problem_dependencies
FROM tasks t JOIN sections u ON u.id=t.section_id WHERE t.id=NEW.task_id;
END;
--> statement-breakpoint
CREATE TRIGGER integration_problem_passed_update AFTER UPDATE ON task_problem_results
WHEN EXISTS (SELECT 1 FROM group_members m JOIN groups g ON g.id = m.group_id WHERE g.client_id IS NOT NULL AND m.profile_id = NEW.user_id)
  AND (OLD.content_hash<>NEW.content_hash OR OLD.source<>NEW.source OR OLD.first_passed_at<>NEW.first_passed_at
    OR OLD.problem_dependencies IS NOT NEW.problem_dependencies)
BEGIN
INSERT OR IGNORE INTO integration_events(id,type,occurred_at,user_id,stage_id,task_id,source,problem_id,content_hash,problem_dependencies)
SELECT json_array('problem',NEW.user_id,NEW.task_id,NEW.problem_id,NEW.content_hash,NEW.source,NEW.updated_at,(SELECT coalesce(max(seq),0)+1 FROM integration_events)),
  'problem_passed',NEW.updated_at,NEW.user_id,u.stage_id,t.id,NEW.source,NEW.problem_id,NEW.content_hash,NEW.problem_dependencies
FROM tasks t JOIN sections u ON u.id=t.section_id WHERE t.id=NEW.task_id;
END;
--> statement-breakpoint
CREATE TRIGGER integration_task_pass_revoked_update AFTER UPDATE ON submissions
WHEN OLD.verdict='pass' AND NEW.verdict IS NOT 'pass'
  AND EXISTS (SELECT 1 FROM group_members m JOIN groups g ON g.id = m.group_id WHERE g.client_id IS NOT NULL AND m.profile_id = NEW.student_id)
BEGIN
INSERT INTO integration_events(id,type,occurred_at,user_id,stage_id,task_id,submission_id,source,submission_attempt,reason)
SELECT lower(hex(randomblob(16))),'task_pass_revoked',coalesce(NEW.reviewed_at,(CAST(strftime('%s','now') AS INTEGER) * 1000 + CAST(substr(strftime('%f','now'),4,3) AS INTEGER))),NEW.student_id,u.stage_id,t.id,NEW.id,NEW.review_source,NEW.attempt,
  CASE WHEN NEW.verdict='resubmit' THEN 'resubmit' WHEN NEW.verdict='fail' THEN 'fail' ELSE 'removed' END
FROM tasks t JOIN sections u ON u.id=t.section_id WHERE t.id=NEW.task_id;
END;
--> statement-breakpoint
CREATE TRIGGER integration_task_pass_revoked_delete AFTER DELETE ON submissions
WHEN OLD.verdict='pass'
  AND EXISTS (SELECT 1 FROM group_members m JOIN groups g ON g.id = m.group_id WHERE g.client_id IS NOT NULL AND m.profile_id = OLD.student_id)
  AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = OLD.student_id)
BEGIN
INSERT INTO integration_events(id,type,occurred_at,user_id,stage_id,task_id,submission_id,source,submission_attempt,reason)
SELECT lower(hex(randomblob(16))),'task_pass_revoked',(CAST(strftime('%s','now') AS INTEGER) * 1000 + CAST(substr(strftime('%f','now'),4,3) AS INTEGER)),OLD.student_id,u.stage_id,t.id,OLD.id,OLD.review_source,OLD.attempt,'removed'
FROM tasks t JOIN sections u ON u.id=t.section_id JOIN stages s ON s.id=u.stage_id WHERE t.id=OLD.task_id;
END;
--> statement-breakpoint
CREATE TRIGGER integration_problem_pass_revoked_delete AFTER DELETE ON task_problem_results
WHEN EXISTS (SELECT 1 FROM group_members m JOIN groups g ON g.id = m.group_id WHERE g.client_id IS NOT NULL AND m.profile_id = OLD.user_id)
  AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = OLD.user_id)
BEGIN
INSERT INTO integration_events(id,type,occurred_at,user_id,stage_id,task_id,source,problem_id,content_hash)
SELECT lower(hex(randomblob(16))),'problem_pass_revoked',(CAST(strftime('%s','now') AS INTEGER) * 1000 + CAST(substr(strftime('%f','now'),4,3) AS INTEGER)),OLD.user_id,u.stage_id,t.id,OLD.source,OLD.problem_id,v.content_hash
FROM tasks t JOIN sections u ON u.id=t.section_id JOIN stages s ON s.id=u.stage_id
JOIN (SELECT OLD.content_hash content_hash UNION SELECT content_hash FROM integration_events
  WHERE user_id=OLD.user_id AND task_id=OLD.task_id AND problem_id=OLD.problem_id AND type='problem_passed') v
WHERE t.id=OLD.task_id;
END;
--> statement-breakpoint
CREATE TRIGGER integration_stage_clear_revoked_update AFTER UPDATE ON enrollments
WHEN OLD.completed_at IS NOT NULL AND NEW.completed_at IS NULL
  AND EXISTS (SELECT 1 FROM group_members m JOIN groups g ON g.id = m.group_id WHERE g.client_id IS NOT NULL AND m.profile_id = NEW.user_id)
BEGIN
INSERT INTO integration_events(id,type,occurred_at,user_id,stage_id)
VALUES (lower(hex(randomblob(16))),'stage_clear_revoked',(CAST(strftime('%s','now') AS INTEGER) * 1000 + CAST(substr(strftime('%f','now'),4,3) AS INTEGER)),NEW.user_id,NEW.stage_id);
END;
--> statement-breakpoint
CREATE TRIGGER integration_stage_unassigned_delete AFTER DELETE ON enrollments
WHEN EXISTS (SELECT 1 FROM group_members m JOIN groups g ON g.id = m.group_id WHERE g.client_id IS NOT NULL AND m.profile_id = OLD.user_id)
  AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = OLD.user_id)
  AND EXISTS (SELECT 1 FROM stages s WHERE s.id = OLD.stage_id)
BEGIN
INSERT INTO integration_events(id,type,occurred_at,user_id,stage_id)
VALUES (lower(hex(randomblob(16))),'stage_unassigned',(CAST(strftime('%s','now') AS INTEGER) * 1000 + CAST(substr(strftime('%f','now'),4,3) AS INTEGER)),OLD.user_id,OLD.stage_id);
END;
--> statement-breakpoint
DROP TABLE integration_group_stages;
--> statement-breakpoint
DROP TABLE integration_group_members;
--> statement-breakpoint
DROP TABLE integration_groups;
--> statement-breakpoint
CREATE VIEW effective_stage_grants (stage_id, profile_id, due_at, message, source_name, group_id) AS
SELECT stage_id, profile_id, due_at, message, source_name, NULL FROM stage_grants
UNION ALL
SELECT s.stage_id, m.profile_id, s.due_at, s.message, c.name, s.group_id
FROM group_stages s
JOIN group_members m ON m.group_id = s.group_id
JOIN profiles p ON p.id = m.profile_id
JOIN groups g ON g.id = s.group_id
LEFT JOIN integration_clients c ON c.id = g.client_id
WHERE p.role = 'student' AND p.disabled = 0;
--> statement-breakpoint
CREATE VIEW effective_stage_unlocks (stage_id, user_id, via, group_id) AS
SELECT stage_id, user_id, via, NULL FROM stage_unlocks
UNION ALL
SELECT s.stage_id, m.profile_id, 'staff', s.group_id
FROM group_stages s
JOIN group_members m ON m.group_id = s.group_id
JOIN profiles p ON p.id = m.profile_id
WHERE s.exempt = 1 AND p.role = 'student' AND p.disabled = 0;
