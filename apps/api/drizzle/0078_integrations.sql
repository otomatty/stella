CREATE TABLE integration_clients (
  id text PRIMARY KEY NOT NULL,
  name text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  token_prefix text NOT NULL,
  scopes text NOT NULL DEFAULT '[]' CHECK (json_valid(scopes) AND json_type(scopes) = 'array'),
  enabled integer NOT NULL DEFAULT 1,
  last_used_at integer,
  created_by text REFERENCES profiles(id) ON DELETE SET NULL,
  created_at integer NOT NULL,
  updated_at integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE integration_groups (
  id text PRIMARY KEY NOT NULL,
  client_id text NOT NULL REFERENCES integration_clients(id) ON DELETE CASCADE,
  external_key text NOT NULL CHECK (length(external_key) BETWEEN 1 AND 100 AND external_key NOT GLOB '*[^A-Za-z0-9:_-]*'),
  name text NOT NULL,
  created_at integer NOT NULL,
  updated_at integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX integration_groups_client_key ON integration_groups(client_id, external_key);
--> statement-breakpoint
CREATE TABLE integration_group_members (
  group_id text NOT NULL REFERENCES integration_groups(id) ON DELETE CASCADE,
  profile_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  external_id text,
  joined_at integer NOT NULL,
  PRIMARY KEY (group_id, profile_id)
);
--> statement-breakpoint
CREATE INDEX integration_members_profile ON integration_group_members(profile_id);
