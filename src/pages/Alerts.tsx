import { useMemo } from "react";
import { Badge } from "../components/ui/Badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/Card";
import { reportFixtures } from "./report-fixtures";

const criticalUnresolved = reportFixtures.filter(
  (report) => report.severity === "Critical" && report.status !== "Resolved",
);

function timeAgo(iso: string) {
  const value = new Date(iso).getTime();
  const diffMs = Date.now() - value;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function Alerts() {
  const items = useMemo(() => criticalUnresolved, []);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
      <Card className="p-6 sm:p-7">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="danger">Critical feed</Badge>
            <Badge variant="outline">Public-facing alerts</Badge>
          </div>
          <CardTitle className="text-3xl sm:text-[2rem]">Active critical alerts</CardTitle>
          <CardDescription className="max-w-3xl text-base leading-7">
            Incidents with highest urgency that remain unresolved.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {items.map((item) => (
            <article key={item.id} className="rounded-3xl border border-danger-400/35 bg-danger-500/12 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-danger-100/80">{item.id}</p>
                  <p className="text-lg font-semibold text-white">{item.damageType}</p>
                </div>
                <Badge variant="danger">{item.severity}</Badge>
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
                  <span className="text-slate-400">Department:</span> {item.departmentFilter}
                </p>
                <p>
                  <span className="text-slate-400">Updated:</span> {timeAgo(item.timestamp)}
                </p>
              </div>
            </article>
          ))}

          {items.length === 0 ? (
            <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
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
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-slate-200">
            `severity === "Critical" && status !== "Resolved"`
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-slate-300">
            This is a citizen alert experience, not an admin moderation workflow.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

