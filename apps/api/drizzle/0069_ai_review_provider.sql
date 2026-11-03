-- 既存の記録には接続先を推測して埋めない。
ALTER TABLE ai_reviews ADD COLUMN provider TEXT CHECK (provider IN ('anthropic', 'openai'));
