-- 問題つきの課題は、問題ごとに合格したコードを D1 に残す (1 問は小さいので R2 に置かない)。
-- 今の版の問題が全部そろった課題の提出は、テストの合否だけで確定する。
-- submissions.review_source は CHECK が無い text 列なので、値 tests はアプリ側で足す。
-- submission_reviews.source は ai と human のままにする。テスト確定の行はここに書かない。

CREATE TABLE task_problem_results (
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  problem_id TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  path TEXT NOT NULL,
  code TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 1,
  first_passed_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, task_id, problem_id)
);
