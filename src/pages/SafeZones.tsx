import { Badge } from "../components/ui/Badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/Card";

export function SafeZones() {
  return (
    <Card className="p-6 sm:p-7">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-3">
          <Badge>Safe zone directory</Badge>
          <Badge variant="outline">Jamaica shelter network</Badge>
        </div>
        <CardTitle className="text-3xl sm:text-[2rem]">Shelters and fallback locations</CardTitle>
        <CardDescription className="max-w-3xl text-base leading-7">
          Static reference list for public safety routing during storms, flooding, and infrastructure outages.
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-sm leading-7 text-slate-300">
          No live shelter or safe-zone directory is loaded in this client yet.
        </div>
        <div className="rounded-3xl border border-dashed border-white/10 bg-transparent p-5 text-sm leading-7 text-slate-300">
          When the directory is connected, this page should surface shelter name, parish, capacity, accessibility
          notes, and any operational guidance attached to the record.
        </div>
      </CardContent>
    </Card>
  );
}
