import { useMemo } from "react";
import { Badge } from "../../components/ui/Badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/Card";
import { severityBadgeVariant } from "../../lib/operations";
import { DEPARTMENT_ORDER, formatTimeAgo } from "../../lib/reporting";
import { useReportStore } from "../../store/useReportStore";
import type { DepartmentFilter, DisasterReport } from "../../lib/reporting";

export function AdminCollaboration() {
  const reports = useReportStore((state) => state.reports);

  const reportsByDepartment = useMemo(() => {
    const map: Record<DepartmentFilter, DisasterReport[]> = {
      NWA: [],
      JPS: [],
      ODPEM: [],
      None: [],
    };

    for (const report of reports) {
      const dept = report.departmentFilter ?? "None";
      map[dept].push(report);
    }

    return map;
  }, [reports]);

  const activeByDepartment = useMemo(() => {
    const map: Record<DepartmentFilter, DisasterReport[]> = {
      NWA: [],
      JPS: [],
      ODPEM: [],
      None: [],
    };

    for (const report of reports) {
      if (report.status === "Resolved") continue;
      const dept = report.departmentFilter ?? "None";
      map[dept].push(report);
    }

    return map;
  }, [reports]);

  const departmentInfo: Record<DepartmentFilter, { name: string; description: string }> = {
    NWA: { name: "National Works Agency", description: "Road infrastructure, drainage, and public works" },
    JPS: { name: "Jamaica Public Service", description: "Power grid, electrical infrastructure, utility restoration" },
    ODPEM: { name: "ODPEM", description: "Emergency management, disaster coordination, public safety" },
    None: { name: "Unrouted", description: "Reports not yet assigned to a department" },
  };

  return (
    <div className="grid gap-6">
      <Card className="p-6">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="warning">Collaboration</Badge>
            <Badge variant="outline">Cross-agency view</Badge>
          </div>
          <CardTitle>Organization-to-Organization Visibility</CardTitle>
          <CardDescription>
            View incident distribution across departments. Enables cross-agency coordination
            and resource sharing during multi-agency response operations.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Department cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {DEPARTMENT_ORDER.map((dept) => {
          const info = departmentInfo[dept];
          const total = reportsByDepartment[dept];
          const active = activeByDepartment[dept];
          const criticalCount = active.filter((r) => r.severity === "Critical").length;

          return (
            <Card key={dept} className="p-6">
              <CardHeader>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant={dept === "None" ? "outline" : "default"}>{dept}</Badge>
                  {criticalCount > 0 && (
                    <Badge variant="danger">{criticalCount} critical</Badge>
                  )}
                </div>
                <CardTitle>{info.name}</CardTitle>
                <CardDescription>{info.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Stats row */}
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-center">
                    <p className="text-2xl font-semibold text-white">{total.length}</p>
                    <p className="text-xs text-slate-400">Total</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-center">
                    <p className="text-2xl font-semibold text-white">{active.length}</p>
                    <p className="text-xs text-slate-400">Active</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-center">
                    <p className="text-2xl font-semibold text-white">
                      {total.length - active.length}
                    </p>
                    <p className="text-xs text-slate-400">Resolved</p>
                  </div>
                </div>

                {/* Recent active incidents */}
                {active.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs uppercase tracking-wider text-slate-500">Recent active</p>
                    {active.slice(0, 3).map((report) => (
                      <div
                        key={report.id}
                        className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium text-white">
                            {report.damageType ?? "Incident"}
                          </p>
                          <p className="text-xs text-slate-400">
                            {report.locationName} - {formatTimeAgo(report.timestamp)}
                          </p>
                        </div>
                        <Badge variant={severityBadgeVariant(report.severity)}>
                          {report.severity ?? "Medium"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
