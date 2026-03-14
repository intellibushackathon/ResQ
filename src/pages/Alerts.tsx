import { Badge } from "../components/ui/Badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/Card";

export function Alerts() {
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
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-sm leading-7 text-slate-300">
            No live critical alerts are loaded in this client yet.
          </div>
          <div className="rounded-3xl border border-dashed border-white/10 bg-transparent p-5 text-sm leading-7 text-slate-300">
            When the alert feed is connected, this page should only surface unresolved incidents that meet the
            critical threshold.
          </div>
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
            This remains a public-facing alert surface and should stay separate from admin moderation workflows.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
