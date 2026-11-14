-- 教材動画を作れなかった理由を seed から記録する。
ALTER TABLE lessons ADD COLUMN video_issue TEXT;
