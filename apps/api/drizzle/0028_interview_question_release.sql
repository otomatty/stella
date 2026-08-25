-- Issue #237 — 「正本の管理に戻す」を予約制にする。
--
-- edited_at をその場で外すと、 本文はまだ編集されたままなのに「編集していない行」に
-- 見えてしまう。 音声側はこの列で「旧共通キーの読み上げを使ってよいか」を判断して
-- いるため、 編集後の本文に編集前の読み上げが付く。 そこで解除は予約として持ち、
-- 実際に本文が正本へ戻る seed のタイミングで edited_at ごと落とす。
ALTER TABLE `interview_questions` ADD `release_requested_at` integer;
