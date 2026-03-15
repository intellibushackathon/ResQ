import { useMemo } from "react";
import { Link } from "react-router-dom";
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
  getActiveReports,
  getPendingReports,
  getResolvedReports,
  getVerifiedReports,
  severityBadgeVariant,
  sortReportsByPriority,
} from "../../lib/operations";
import { formatTimeAgo } from "../../lib/reporting";
import { useReportStore } from "../../store/useReportStore";

export function AdminDashboard() {
  const reports = useReportStore((state) => state.reports);
  const auditLogs = useReportStore((state) => state.auditLogs);
  const isAdminDataLoading = useReportStore((state) => state.isAdminDataLoading);

  const totalReports = reports.length;
  const pendingReports = useMemo(() => getPendingReports(reports), [reports]);
  const verifiedReports = useMemo(() => getVerifiedReports(reports), [reports]);
  const resolvedReports = useMemo(() => getResolvedReports(reports), [reports]);

  const priorityQueue = useMemo(
    () => sortReportsByPriority(getActiveReports(reports)).slice(0, 5),
    [reports],
  );

  const recentLogs = useMemo(() => auditLogs.slice(0, 5), [auditLogs]);

  const quickLinks = [
    {
      to: "/admin/moderation",
      label: "Moderation",
      description: "Review and verify pending reports.",
      badge: `${pendingReports.length} pending`,
      badgeVariant: "warning" as const,
    },
    {
      to: "/admin/audit-logs",
      label: "Audit Logs",
      description: "Searchable operator and system event timeline.",
      badge: `${auditLogs.length} entries`,
      badgeVariant: "outline" as const,
    },
    {
      to: "/admin/system-controls",
      label: "System Controls",
      description: "Feature toggles, rate limits, and lockdown controls.",
      badge: "Controls",
      badgeVariant: "outline" as const,
    },
    {
      to: "/admin/team",
      label: "Team",
      description: "Operational roster and duty readiness board.",
      badge: "Roster",
      badgeVariant: "outline" as const,
    },
    {
      to: "/admin/settings",
      label: "Settings",
      description: "AI, messaging, and platform configuration.",
      badge: "Config",
      badgeVariant: "outline" as const,
    },
  ];

  return (
    <div className="grid gap-6">
      {/* Metric cards */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total reports",
            value: totalReports,
            helper: "All reports in the system",
            tone: "default" as const,
          },
          {
            label: "Pending validation",
            value: pendingReports.length,
            helper: "Awaiting moderation review",
            tone: "warning" as const,
          },
          {
            label: "Verified",
            value: verifiedReports.length,
            helper: "Confirmed incidents in workflow",
            tone: "success" as const,
          },
          {
            label: "Resolved",
            value: resolvedReports.length,
            helper: "Closed incidents",
            tone: "outline" as const,
          },
        ].map((item) => (
          <Card key={item.label} className="p-5">
            <CardHeader className="mb-3 gap-1">
              <Badge variant={item.tone} className="w-fit">
                {item.label}
              </Badge>
              <CardTitle className="text-4xl">{item.value}</CardTitle>
              <CardDescription>{item.helper}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        {/* Priority queue preview */}
        <Card className="p-6">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="danger">Priority queue</Badge>
              <Badge variant="outline">Top 5 active</Badge>
            </div>
            <CardTitle>Highest-priority incidents</CardTitle>
            <CardDescription>
              Active reports sorted by severity then newest timestamp. Resolved incidents are excluded.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {priorityQueue.length > 0 ? (
              priorityQueue.map((report) => (
                <div
                  key={report.id}
                  className="rounded-lg border border-white/10 bg-white/[0.04] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{report.id}</p>
                      <p className="mt-1 text-lg font-semibold text-white">
                        {report.damageType ?? "Incident"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={severityBadgeVariant(report.severity)}>
                        {report.severity ?? "Medium"}
                      </Badge>
                      <Badge variant="outline">{report.status}</Badge>
                    </div>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{report.description}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
                    <span>{report.locationName}</span>
                    <span>{formatTimeAgo(report.timestamp)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
                No active incidents are in the queue right now.
              </div>
            )}

            {priorityQueue.length > 0 && (
              <Link
                to="/admin/moderation"
                className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-xl border border-white/10 px-4 text-sm font-semibold text-slate-100 transition hover:border-brand-400/40 hover:bg-brand-500/10"
              >
                View full moderation queue
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Right column: audit logs + quick links */}
        <div className="flex flex-col gap-6">
          {/* Recent audit logs */}
          <Card className="p-6">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline">Recent activity</Badge>
                {isAdminDataLoading ? <Badge>Loading...</Badge> : null}
              </div>
              <CardTitle>Latest audit entries</CardTitle>
              <CardDescription>Last 5 system and operator events.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentLogs.length > 0 ? (
                recentLogs.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-lg border border-white/10 bg-white/[0.04] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge variant={auditLevelBadgeVariant(entry.level)}>{entry.level}</Badge>
                      <span className="text-xs text-slate-500">
                        {formatAbsoluteTimestamp(entry.createdAt)}
                      </span>
                    </div>
                    <p className="mt-2 font-semibold text-white">{entry.title}</p>
                    <p className="mt-1 text-sm text-slate-300">{entry.detail}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
                  {isAdminDataLoading ? "Loading audit entries..." : "No audit entries available yet."}
                </div>
              )}

              {recentLogs.length > 0 && (
                <Link
                  to="/admin/audit-logs"
                  className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-xl border border-white/10 px-4 text-sm font-semibold text-slate-100 transition hover:border-brand-400/40 hover:bg-brand-500/10"
                >
                  View all audit logs
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Quick navigation */}
          <Card className="p-6">
            <CardHeader>
              <Badge variant="outline" className="w-fit">
                Quick navigation
              </Badge>
              <CardTitle>Admin modules</CardTitle>
              <CardDescription>Jump directly to any admin section.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {quickLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 transition hover:border-white/15 hover:bg-white/[0.07]"
                >
                  <div>
                    <p className="font-semibold text-white">{link.label}</p>
                    <p className="mt-0.5 text-sm text-slate-400">{link.description}</p>
                  </div>
                  <Badge variant={link.badgeVariant}>{link.badge}</Badge>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
