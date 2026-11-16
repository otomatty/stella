ALTER TABLE integration_clients ADD COLUMN allowed_stage_prefixes text NOT NULL DEFAULT '[]' CHECK (json_valid(allowed_stage_prefixes) AND json_type(allowed_stage_prefixes) = 'array');
--> statement-breakpoint
CREATE UNIQUE INDEX integration_members_external_unique ON integration_group_members(group_id, external_id);
--> statement-breakpoint
ALTER TABLE stage_grants ADD COLUMN source_group_id text REFERENCES integration_groups(id);
--> statement-breakpoint
CREATE INDEX stage_grants_source_group ON stage_grants(source_group_id);
--> statement-breakpoint
ALTER TABLE stage_unlocks ADD COLUMN source_group_id text REFERENCES integration_groups(id);
--> statement-breakpoint
CREATE TABLE integration_group_stages (
  group_id text NOT NULL REFERENCES integration_groups(id) ON DELETE CASCADE,
  stage_id text NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
  due_at text,
  message text,
  exempt integer NOT NULL DEFAULT 0,
  PRIMARY KEY (group_id, stage_id)
);
