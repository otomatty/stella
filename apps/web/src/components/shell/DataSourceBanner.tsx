export type DataSourceKind = "db" | "fixtures" | "error";

const LABEL: Record<DataSourceKind, string> = {
  db: "Data: db",
  fixtures: "Data: fixtures (demo)",
  error: "Data: error",
};

export function DataSourceBanner({ source }: { source: DataSourceKind }) {
  if (!import.meta.env.DEV) return null;
  return (
    <div
      role="status"
      className="px-7 py-1 text-[11px] font-mono border-b border-border bg-muted/40 text-muted-foreground"
    >
      {LABEL[source]}
    </div>
  );
}
