import { useMemo, useState } from "react";
import { Badge } from "../components/ui/Badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/Card";
import { reportFixtures, type DisasterReport, type ReportStatus } from "./report-fixtures";

const statusStages: ReportStatus[] = ["Pending Validation", "Verified", "Resolved"];

function getProgressPercent(status: ReportStatus) {
  const idx = statusStages.indexOf(status);
  return ((idx + 1) / statusStages.length) * 100;
}

function timeAgo(iso: string) {
  const value = new Date(iso).getTime();
  const diffMs = Date.now() - value;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function statusBadgeVariant(status: ReportStatus): "warning" | "default" | "success" {
  if (status === "Pending Validation") return "warning";
  if (status === "Resolved") return "success";
  return "default";
}

export function MyReports() {
  const [activeStatus, setActiveStatus] = useState<ReportStatus | "All">("All");
  const [selectedId, setSelectedId] = useState<string>(reportFixtures[0]?.id ?? "");

  const reports = useMemo<DisasterReport[]>(
    () =>
      activeStatus === "All"
        ? reportFixtures
        : reportFixtures.filter((report) => report.status === activeStatus),
    [activeStatus],
  );

  const selected = reports.find((report) => report.id === selectedId) ?? reports[0] ?? null;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
      <Card className="p-6 sm:p-7">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <Badge>Citizen history</Badge>
            <Badge variant="outline">Status browsing</Badge>
            <Badge variant="success">Progress tracking</Badge>
          </div>
          <CardTitle className="text-3xl sm:text-[2rem]">My reports</CardTitle>
          <CardDescription className="max-w-3xl text-base leading-7">
            Monitor incident progression from intake to resolution with map and case details.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="mb-5 flex flex-wrap gap-2">
            {["All", ...statusStages].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setActiveStatus(status as ReportStatus | "All")}
                className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                  activeStatus === status
                    ? "border-brand-400/40 bg-brand-500/16 text-brand-100"
                    : "border-white/15 bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {reports.map((report) => (
              <button
                key={report.id}
                type="button"
                onClick={() => setSelectedId(report.id)}
                className={`w-full rounded-3xl border p-4 text-left transition ${
                  selected?.id === report.id
                    ? "border-brand-400/35 bg-brand-500/12"
                    : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
                }`}
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{report.id}</p>
                    <p className="text-lg font-semibold text-white">{report.damageType}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={statusBadgeVariant(report.status)}>{report.status}</Badge>
                    <p className="mt-2 text-xs text-slate-400">{timeAgo(report.timestamp)}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-300">{report.description}</p>
                <div className="mt-4 h-2 rounded-full bg-panel-900/80">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-brand-500 to-success-500"
                    style={{ width: `${getProgressPercent(report.status)}%` }}
                  />
                </div>
              </button>
            ))}

            {reports.length === 0 ? (
              <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
                No reports found for this status filter.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="p-6">
        <CardHeader>
          <Badge variant="outline" className="w-fit">
            Detail and map support
          </Badge>
          <CardTitle>Selected report details</CardTitle>
          <CardDescription>Preview card for location and route data from the report shape.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {selected ? (
            <>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm text-slate-400">Location</p>
                <p className="mt-1 font-semibold text-white">{selected.locationName}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {selected.lat.toFixed(6)}, {selected.lng.toFixed(6)}
                </p>
              </div>

              <div className="relative h-36 rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_30%_20%,rgba(36,145,255,0.32),transparent_52%),linear-gradient(145deg,rgba(9,24,43,0.82),rgba(6,17,31,0.9))]">
                <span className="absolute left-3 top-3 text-xs uppercase tracking-[0.24em] text-brand-100">
                  Map detail area
                </span>
                <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-danger-500 shadow-[0_0_18px_rgba(255,91,115,0.75)]" />
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm text-slate-400">Progress track</p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {statusStages.map((stage) => {
                    const reached = statusStages.indexOf(stage) <= statusStages.indexOf(selected.status);
                    return (
                      <div
                        key={stage}
                        className={`rounded-xl border px-2 py-2 text-center text-xs ${
                          reached
                            ? "border-success-400/35 bg-success-500/16 text-success-100"
                            : "border-white/10 bg-panel-900/80 text-slate-500"
                        }`}
                      >
                        {stage}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
              Select a report to inspect location and progress details.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

