ALTER TABLE profiles ADD COLUMN weekly_hours real NOT NULL DEFAULT 35 CHECK (weekly_hours >= 1 AND weekly_hours <= 80);
--> statement-breakpoint
ALTER TABLE profiles ADD COLUMN learning_start_date text;
--> statement-breakpoint
CREATE TABLE learner_instructors (
  learner_id text PRIMARY KEY NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  instructor_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX learner_instructors_instructor_idx ON learner_instructors(instructor_id);
--> statement-breakpoint
CREATE TABLE learning_pace_changes (
  user_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date text NOT NULL,
  weekly_hours real NOT NULL,
  PRIMARY KEY (user_id, date)
);
--> statement-breakpoint
CREATE TABLE learning_diagnostics (
  user_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_id text NOT NULL,
  confirmed_by text REFERENCES profiles(id) ON DELETE SET NULL,
  evidence text NOT NULL,
  confirmed_at integer NOT NULL DEFAULT (unixepoch() * 1000),
  PRIMARY KEY (user_id, skill_id)
);
--> statement-breakpoint
CREATE INDEX learning_diagnostics_confirmer_idx ON learning_diagnostics(confirmed_by);
--> statement-breakpoint
-- 既存の開始履歴も使う。開始日を持たない受講者には作成日などの代替を入れない。
UPDATE profiles SET learning_start_date = (
  SELECT date(e.enrolled_at / 1000, 'unixepoch', '+9 hours') FROM enrollments e
  JOIN stages s ON s.id = e.stage_id
  WHERE e.user_id = profiles.id AND e.tenant_id = profiles.tenant_id AND s.slug = 'dev-env-basics'
  ORDER BY e.enrolled_at LIMIT 1
);
--> statement-breakpoint
CREATE TRIGGER learning_pace_start AFTER INSERT ON enrollments
WHEN EXISTS (SELECT 1 FROM stages WHERE id = NEW.stage_id AND slug = 'dev-env-basics')
BEGIN
  UPDATE profiles SET learning_start_date = date(NEW.enrolled_at / 1000, 'unixepoch', '+9 hours')
  WHERE id = NEW.user_id AND tenant_id = NEW.tenant_id AND learning_start_date IS NULL;
END;
--> statement-breakpoint
-- 時間設定の履歴は差の計算に使う。目標日や残りの予定は書き込まない。
CREATE TRIGGER learning_pace_hours_changed AFTER UPDATE OF weekly_hours ON profiles
WHEN OLD.weekly_hours <> NEW.weekly_hours
BEGIN
  INSERT INTO learning_pace_changes (user_id, date, weekly_hours)
  VALUES (NEW.id, date('now', '+9 hours'), NEW.weekly_hours)
  ON CONFLICT(user_id, date) DO UPDATE SET weekly_hours = excluded.weekly_hours;
END;
--> statement-breakpoint
ALTER TABLE task_progress ADD COLUMN passed_at integer;
--> statement-breakpoint
UPDATE task_progress SET passed_at = updated_at WHERE status IN ('passed', 'ai-passed');
--> statement-breakpoint
-- 最初に合格した日を保つ。AI合格→講師確認や再読込で確認Bが先延ばしにならない。
CREATE TRIGGER task_first_pass_insert AFTER INSERT ON task_progress
WHEN NEW.status IN ('passed', 'ai-passed') AND NEW.passed_at IS NULL
BEGIN
  UPDATE task_progress SET passed_at = NEW.updated_at WHERE user_id = NEW.user_id AND task_id = NEW.task_id;
END;
--> statement-breakpoint
CREATE TRIGGER task_first_pass_update AFTER UPDATE OF status, content_hash ON task_progress
BEGIN
  UPDATE task_progress SET passed_at = CASE
    WHEN NEW.status IN ('passed', 'ai-passed') THEN
      CASE WHEN OLD.content_hash = NEW.content_hash THEN coalesce(OLD.passed_at, NEW.updated_at) ELSE NEW.updated_at END
    ELSE CASE WHEN OLD.content_hash = NEW.content_hash THEN OLD.passed_at ELSE NULL END
  END WHERE user_id = NEW.user_id AND task_id = NEW.task_id;
END;
