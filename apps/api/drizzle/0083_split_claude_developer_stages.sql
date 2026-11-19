-- 分割前に配った資格講座の受講者は続きの2ステージも選べる。初回だけ引き継ぐ。
-- seed より先に適用するので、旧ステージがある DB にだけ割当先を下書きで作る。
-- UUID は seed の stableUuid('course:ses:<slug>')。教材と前提は通常の seed が公開する。
WITH next_stages(id, slug, title) AS (
  VALUES
    ('50c9b551-ea11-5063-9feb-2cd1b205f556', 'claude-developer-practice', 'Claude 実践一問一答'),
    ('d6f34d0e-8556-5aa4-a94d-94a80d4c13fa', 'claude-developer-mock-exam', 'Claude 認定模擬試験')
)
INSERT INTO stages (id, tenant_id, slug, title, audience, status, created_at, updated_at)
SELECT n.id, original.tenant_id, n.slug, n.title, 'granted', 'draft', original.created_at, original.updated_at
FROM next_stages n CROSS JOIN stages original
WHERE original.id = '5efbe977-27d8-55f6-a069-a5583780adef'
  AND original.tenant_id = 'ses' AND original.slug = 'claude-developer-foundations'
ON CONFLICT(id) DO NOTHING;
--> statement-breakpoint
INSERT INTO stage_grants (
  id, tenant_id, stage_id, profile_id, granted_by, granted_at, source_name, due_at, message, source_group_id
)
SELECT lower(hex(randomblob(16))), g.tenant_id, n.id, g.profile_id, g.granted_by, g.granted_at,
       g.source_name, g.due_at, g.message, g.source_group_id
FROM stage_grants g JOIN stages n ON n.tenant_id = g.tenant_id
WHERE g.tenant_id = 'ses' AND g.stage_id = '5efbe977-27d8-55f6-a069-a5583780adef'
  AND n.id IN ('50c9b551-ea11-5063-9feb-2cd1b205f556', 'd6f34d0e-8556-5aa4-a94d-94a80d4c13fa')
ON CONFLICT(stage_id, profile_id) DO NOTHING;
