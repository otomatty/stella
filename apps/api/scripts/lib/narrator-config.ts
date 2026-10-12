export function withNarratorDatabase(source: string, databaseId: string): string {
  const config = JSON.parse(source) as {
    d1_databases?: { binding?: string; database_name?: string; database_id?: string }[];
  };
  const bindings = config.d1_databases;
  if (
    !bindings ||
    bindings.length !== 1 ||
    bindings[0]?.binding !== "DB" ||
    bindings[0].database_name !== "stella-db"
  )
    throw new Error("Narrator must use the STELLA database");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(databaseId))
    throw new Error("Invalid database ID");
  bindings[0].database_id = databaseId;
  return `${JSON.stringify(config, null, 2)}\n`;
}
