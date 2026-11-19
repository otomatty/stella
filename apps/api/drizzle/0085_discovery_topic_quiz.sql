-- 新しい表記の依頼がすでにある場合は、既存の行をそのまま残す。
UPDATE discovery_requests AS request
SET topic = 'クイズ' || substr(request.topic, 6)
WHERE substr(request.topic, 1, 6) = '確認テスト「'
  AND NOT EXISTS (
    SELECT 1
    FROM discovery_requests AS existing
    WHERE existing.tenant_id = request.tenant_id
      AND existing.stage_id = request.stage_id
      AND existing.topic = 'クイズ' || substr(request.topic, 6)
  );
