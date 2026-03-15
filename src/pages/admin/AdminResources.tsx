import { useMemo } from "react";
import { Badge } from "../../components/ui/Badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/Card";
import {
  getResponderLoadMap,
  getIncidentsByProgression,
  getProgressionSummary,
} from "../../lib/admin-operations";
import { useReportStore } from "../../store/useReportStore";

export function AdminResources() {
  const reports = useReportStore((state) => state.reports);

  const responderLoad = useMemo(() => getResponderLoadMap(reports), [reports]);
  const progressionSummary = useMemo(() => getProgressionSummary(reports), [reports]);
  const byProgression = useMemo(() => getIncidentsByProgression(reports), [reports]);

  const responderEntries = useMemo(() => {
    return Array.from(responderLoad.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id, count]) => ({ id, count }));
  }, [responderLoad]);

  const progressionStages: Array<{
    key: keyof typeof progressionSummary;
    label: string;
    color: string;
  }> = [
    { key: "unassigned", label: "Unassigned", color: "bg-slate-500" },
    { key: "assigned", label: "Assigned", color: "bg-blue-500" },
    { key: "en_route", label: "En Route", color: "bg-cyan-500" },
    { key: "on_scene", label: "On Scene", color: "bg-yellow-500" },
    { key: "resolved", label: "Resolved", color: "bg-green-500" },
    { key: "escalated", label: "Escalated", color: "bg-red-500" },
    { key: "cancelled", label: "Cancelled", color: "bg-gray-500" },
    { key: "failed", label: "Failed", color: "bg-red-700" },
  ];

  const totalActive = reports.filter((r) => r.status !== "Resolved").length;

  return (
    <div className="grid gap-6">
      <Card className="p-6">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="default">Resources</Badge>
            <Badge variant="outline">{totalActive} active incidents</Badge>
          </div>
          <CardTitle>Human Resource Allocation</CardTitle>
          <CardDescription>
            Overview of responder assignments, workload distribution, and incident
            progression across all active operations.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Incident Progression Tracker */}
        <Card className="p-6">
          <CardHeader>
            <Badge variant="outline" className="w-fit">Progression Pipeline</Badge>
            <CardTitle>Incident Status Distribution</CardTitle>
            <CardDescription>
              End-to-end tracking of incidents from submission through resolution.
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-4 space-y-3">
            {progressionStages.map((stage) => {
              const count = progressionSummary[stage.key];
              const maxCount = Math.max(...Object.values(progressionSummary), 1);
              const widthPercent = (count / maxCount) * 100;

              return (
                <div key={stage.key}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-slate-300">{stage.label}</span>
                    <span className="font-semibold text-white">{count}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${stage.color}`}
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Responder Workload */}
        <Card className="p-6">
          <CardHeader>
            <Badge variant="outline" className="w-fit">Workload</Badge>
            <CardTitle>Responder Assignment Load</CardTitle>
            <CardDescription>
              Active incident assignments per responder. High loads may indicate
              need for rebalancing.
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-4">
            {responderEntries.length > 0 ? (
              <div className="space-y-3">
                {responderEntries.map((entry) => {
                  const loadLevel =
                    entry.count >= 5 ? "danger" :
                    entry.count >= 3 ? "warning" :
                    "success";

                  return (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">
                          Responder {entry.id.slice(0, 8)}...
                        </p>
                        <p className="text-xs text-slate-400">
                          {entry.count} active assignment{entry.count === 1 ? "" : "s"}
                        </p>
                      </div>
                      <Badge variant={loadLevel}>
                        {entry.count >= 5 ? "High Load" : entry.count >= 3 ? "Moderate" : "Normal"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
                No responder assignments recorded yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Operational Status Summary */}
      <Card className="p-6">
        <CardHeader>
          <Badge variant="outline" className="w-fit">Operations Summary</Badge>
          <CardTitle>Operational Status Visibility</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Unassigned", count: progressionSummary.unassigned, variant: "warning" as const },
              { label: "In Progress", count: progressionSummary.assigned + progressionSummary.en_route + progressionSummary.on_scene, variant: "default" as const },
              { label: "Resolved", count: progressionSummary.resolved, variant: "success" as const },
              { label: "Needs Attention", count: progressionSummary.escalated + progressionSummary.failed, variant: "danger" as const },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-center"
              >
                <p className="text-3xl font-semibold text-white">{item.count}</p>
                <Badge variant={item.variant} className="mt-2">{item.label}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
