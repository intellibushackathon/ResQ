import { useMemo } from "react";
import { Badge } from "../components/ui/Badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/Card";
import { type DisasterReport, formatTimeAgo, sortReportsByPriority } from "../lib/reporting";
import { useReportStore } from "../store/useReportStore";

export function Alerts() {
  const reports = useReportStore((state) => state.reports);
  const isReady = useReportStore((state) => state.isReady);
  const isInitializing = useReportStore((state) => state.isInitializing);
  const loadError = useReportStore((state) => state.loadError);

  const items = useMemo<DisasterReport[]>(
    () =>
      sortReportsByPriority(
        reports.filter((report) => report.severity === "Critical" && report.status !== "Resolved"),
      ),
    [reports],
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
      <Card className="p-6 sm:p-7">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="danger">Critical feed</Badge>
            <Badge variant="outline">Public-facing alerts</Badge>
          </div>
          <CardTitle className="text-xl">Active critical alerts</CardTitle>
          <CardDescription className="max-w-3xl text-base leading-7">
            Incidents with highest urgency that remain unresolved.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {isInitializing && !isReady ? (
            <p className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
              Loading critical alerts...
            </p>
          ) : null}

          {loadError ? (
            <p className="rounded-xl border border-danger-400/35 bg-danger-500/12 p-4 text-sm text-danger-100">
              {loadError}
            </p>
          ) : null}

          {items.map((item) => (
            <article key={item.id} className="rounded-xl border border-danger-400/35 bg-danger-500/12 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-danger-100/80">{item.id}</p>
                  <p className="text-lg font-semibold text-white">{item.damageType ?? "Incident"}</p>
                </div>
                <Badge variant="danger">{item.severity ?? "Critical"}</Badge>
              </div>
              <p className="text-sm text-slate-100">{item.description}</p>
              <div className="mt-3 grid gap-2 text-sm text-slate-200 md:grid-cols-2">
                <p>
                  <span className="text-slate-400">Status:</span> {item.status}
                </p>
                <p>
                  <span className="text-slate-400">Location:</span> {item.locationName}
                </p>
                <p>
                  <span className="text-slate-400">Department:</span> {item.departmentFilter ?? "None"}
                </p>
                <p>
                  <span className="text-slate-400">Updated:</span> {formatTimeAgo(item.timestamp)}
                </p>
              </div>
            </article>
          ))}

          {isReady && items.length === 0 && !loadError ? (
            <p className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
              No critical unresolved incidents at this time.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="p-6">
        <CardHeader>
          <Badge variant="outline" className="w-fit">
            Feed policy
          </Badge>
          <CardTitle>Alert filter rule</CardTitle>
          <CardDescription>This feed intentionally follows the blueprint rule exactly.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-slate-200">
            `severity === "Critical" && status !== "Resolved"`
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-slate-300">
            This remains a public-facing alert surface and stays separate from admin moderation workflows.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
