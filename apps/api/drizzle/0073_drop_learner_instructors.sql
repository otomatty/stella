-- 受講者ごとの担当講師をやめる。割り当て表は残さない。
DROP INDEX IF EXISTS learner_instructors_instructor_idx;
DROP TABLE IF EXISTS learner_instructors;
