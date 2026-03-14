import { Badge } from "../components/ui/Badge";
import { REPORT_STATUS_STAGES, type ReportStatus } from "../lib/reporting";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/Card";

function statusBadgeVariant(status: ReportStatus): "warning" | "default" | "success" {
  if (status === "Pending Validation") return "warning";
  if (status === "Resolved") return "success";
  return "default";
}

export function MyReports() {
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

        <CardContent className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-sm leading-7 text-slate-300">
            No submitted reports are loaded in this client yet.
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {REPORT_STATUS_STAGES.map((stage) => (
              <div key={stage} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <Badge variant={statusBadgeVariant(stage)}>{stage}</Badge>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  This status remains part of the report lifecycle once citizen history is connected to live data.
                </p>
              </div>
            ))}
          </div>
          <div className="rounded-3xl border border-dashed border-white/10 bg-transparent p-5 text-sm leading-7 text-slate-300">
            This screen is ready for live report history, timestamps, and follow-up actions as soon as the report
            read path is wired into the client.
          </div>
        </CardContent>
      </Card>

      <Card className="p-6">
        <CardHeader>
          <Badge variant="outline" className="w-fit">
            Detail and map support
          </Badge>
          <CardTitle>Report detail panel</CardTitle>
          <CardDescription>Live report metadata will appear here after the citizen history query is connected.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
            Connect the report detail query to show incident location, status timeline, media, and routing context here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
