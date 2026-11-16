import {
  INTEGRATION_SCOPES,
  type IntegrationClient,
  type IntegrationScope,
} from "@stella/shared/integrations/types";

interface IntegrationClientDraft {
  savedPrefixes: string;
  savedScopes: string;
  prefixes: string;
  scopes: IntegrationScope[];
}

/** 一覧の再取得で参照だけ変わった場合は編集中の値を保つ。各項目を独立に同期する。 */
export function syncIntegrationClientDraft(
  previous: IntegrationClientDraft | null,
  client: Pick<IntegrationClient, "allowedStagePrefixes" | "scopes">,
): IntegrationClientDraft {
  const prefixes = client.allowedStagePrefixes.join(", ");
  const scopes = INTEGRATION_SCOPES.filter((scope) => client.scopes.includes(scope));
  const savedScopes = scopes.join("\n");
  if (previous?.savedPrefixes === prefixes && previous.savedScopes === savedScopes) return previous;
  return {
    savedPrefixes: prefixes,
    savedScopes,
    prefixes: previous?.savedPrefixes === prefixes ? previous.prefixes : prefixes,
    scopes: previous?.savedScopes === savedScopes ? previous.scopes : scopes,
  };
}
