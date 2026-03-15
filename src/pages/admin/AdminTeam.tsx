import { useMemo } from "react";
import { Badge } from "../../components/ui/Badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import { OPERATIONS_TEAM } from "../../lib/operations";
import { roleDisplayLabel, useAuthStore } from "../../store/useAuthStore";

export function AdminTeam() {
  const session = useAuthStore((state) => state.session);

  const statusSummary = useMemo(() => {
    return OPERATIONS_TEAM.reduce<Record<string, number>>((counts, member) => {
      counts[member.status] = (counts[member.status] ?? 0) + 1;
      return counts;
    }, {});
  }, []);

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <CardHeader className="mb-3 gap-1">
            <Badge className="w-fit">Current user</Badge>
            <CardTitle>{session?.displayName ?? "Admin session"}</CardTitle>
            <CardDescription>
              {session ? `${roleDisplayLabel(session.role)} access on ${session.staffOrg ?? "ResQ"}.` : "Protected session required."}
            </CardDescription>
          </CardHeader>
        </Card>

        {Object.entries(statusSummary).map(([status, count]) => (
          <Card key={status} className="p-5">
            <CardHeader className="mb-3 gap-1">
              <Badge variant="outline" className="w-fit">
                {status}
              </Badge>
              <CardTitle className="text-4xl">{count}</CardTitle>
              <CardDescription>Hardcoded roster members in this readiness band.</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>

      <Card className="p-6">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline">Readiness board</Badge>
            <Badge>{OPERATIONS_TEAM.length} roster members</Badge>
          </div>
          <CardTitle>Team roster</CardTitle>
          <CardDescription>
            Current user context plus the documented hardcoded operations roster for coordination visibility.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {session ? (
            <article className="rounded-[24px] border border-brand-400/25 bg-brand-500/10 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-brand-200/70">Current session</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{session.displayName}</p>
                </div>
                <Badge>{roleDisplayLabel(session.role)}</Badge>
              </div>
              <div className="mt-4 grid gap-2 text-sm text-slate-200">
                <p>Email: {session.email ?? "Not available"}</p>
                <p>Organization: {session.staffOrg ?? "Unassigned"}</p>
                <p>Role path: {session.role === "admin" ? "Operations leadership" : "Field responder"}</p>
              </div>
            </article>
          ) : null}

          {OPERATIONS_TEAM.map((member) => (
            <article
              key={member.id}
              className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{member.org}</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{member.name}</p>
                </div>
                <Badge variant="outline">{member.status}</Badge>
              </div>
              <p className="mt-3 text-sm text-slate-300">{member.title}</p>
              <div className="mt-4 grid gap-2 text-sm text-slate-200">
                <p>Shift: {member.shift}</p>
                <p>Specialty: {member.specialty}</p>
                <p>Channel: {member.channel}</p>
                <p>Base: {member.base}</p>
              </div>
            </article>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
