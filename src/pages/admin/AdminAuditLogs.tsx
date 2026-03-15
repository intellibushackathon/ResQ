import { useMemo, useState } from "react";
import { Badge } from "../../components/ui/Badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import {
  auditLevelBadgeVariant,
  formatAbsoluteTimestamp,
} from "../../lib/operations";
import { useReportStore } from "../../store/useReportStore";

export function AdminAuditLogs() {
  const auditLogs = useReportStore((state) => state.auditLogs);
  const isAdminDataLoading = useReportStore((state) => state.isAdminDataLoading);
  const adminSettingsWarning = useReportStore((state) => state.adminSettingsWarning);

  const [query, setQuery] = useState("");

  const filteredLogs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return auditLogs;

    return auditLogs.filter((entry) =>
      [entry.id, entry.title, entry.detail, entry.level].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      ),
    );
  }, [auditLogs, query]);

  return (
    <div className="grid gap-6">
      <Card className="p-6">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline">Searchable timeline</Badge>
            <Badge>{filteredLogs.length} entries</Badge>
          </div>
          <CardTitle>Operational audit logs</CardTitle>
          <CardDescription>
            Search operator actions, system events, and workflow changes across the protected admin surface.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="block space-y-2">
            <span className="section-label">Search logs</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by id, title, detail, or level"
              className="h-11 w-full rounded-xl border border-white/15 bg-panel-900/60 px-4 text-sm text-slate-100 placeholder:text-slate-500"
            />
          </label>

          {adminSettingsWarning ? (
            <div className="rounded-lg border border-warning-400/35 bg-warning-500/12 p-4 text-sm text-warning-100">
              {adminSettingsWarning}
            </div>
          ) : null}

          {isAdminDataLoading ? (
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
              Refreshing audit activity...
            </div>
          ) : null}

          <div className="space-y-3">
            {filteredLogs.map((entry) => (
              <article
                key={entry.id}
                className="rounded-lg border border-white/10 bg-white/[0.04] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={auditLevelBadgeVariant(entry.level)}>{entry.level}</Badge>
                    <span className="text-xs uppercase tracking-[0.2em] text-slate-500">{entry.id}</span>
                  </div>
                  <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    {formatAbsoluteTimestamp(entry.createdAt)}
                  </span>
                </div>
                <p className="mt-3 text-lg font-semibold text-white">{entry.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{entry.detail}</p>
              </article>
            ))}

            {!isAdminDataLoading && filteredLogs.length === 0 ? (
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
                No audit entries matched the current search.
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
