import { Badge } from "../components/ui/Badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/Card";

type SafeZone = {
  name: string;
  parish: string;
  type: string;
  capacity: string;
  notes: string;
};

const safeZones: SafeZone[] = [
  {
    name: "National Arena Shelter",
    parish: "Kingston",
    type: "Primary shelter",
    capacity: "1,200",
    notes: "Medical triage station and backup generators available.",
  },
  {
    name: "Portmore Community Refuge",
    parish: "St. Catherine",
    type: "Flood fallback center",
    capacity: "800",
    notes: "Priority intake for families from low-lying coastal blocks.",
  },
  {
    name: "Montego Bay Civic Hall",
    parish: "St. James",
    type: "Storm shelter",
    capacity: "650",
    notes: "Accessible entry points and coordinated relief distribution.",
  },
  {
    name: "Mandeville Parish Hub",
    parish: "Manchester",
    type: "Regional assembly point",
    capacity: "500",
    notes: "Useful as inland fallback when southern roads are compromised.",
  },
];

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
        {safeZones.map((zone) => (
          <article key={zone.name} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{zone.parish}</p>
                <h3 className="mt-1 font-display text-xl text-white">{zone.name}</h3>
              </div>
              <Badge variant="success">{zone.type}</Badge>
            </div>
            <p className="text-sm text-slate-300">{zone.notes}</p>
            <p className="mt-3 text-sm text-slate-200">
              <span className="text-slate-400">Estimated capacity:</span> {zone.capacity}
            </p>
          </article>
        ))}
      </CardContent>
    </Card>
  );
}

