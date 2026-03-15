import { useEffect, useMemo, useState } from "react";
import { IncidentMap } from "../components/maps/IncidentMap";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { formatConfidence } from "../lib/confidence";
import {
  alertStateBadgeVariant,
  formatAbsoluteTimestamp,
  getActiveResponderQueue,
  getCriticalActiveReports,
  getDispatchedReports,
  severityBadgeVariant,
} from "../lib/operations";
import { REPORT_STATUS_STAGES, formatTimeAgo, toDisplayCoordinate } from "../lib/reporting";
import { useAuthStore } from "../store/useAuthStore";
import { useReportStore } from "../store/useReportStore";

type WorkflowAction = "verify" | "dispatch" | "resolve" | null;

export function Dashboard() {
  const session = useAuthStore((state) => state.session);
  const reports = useReportStore((state) => state.reports);
  const isReady = useReportStore((state) => state.isReady);
  const isInitializing = useReportStore((state) => state.isInitializing);
  const loadError = useReportStore((state) => state.loadError);
  const verifyReport = useReportStore((state) => state.verifyReport);
  const dispatchReport = useReportStore((state) => state.dispatchReport);
  const resolveReport = useReportStore((state) => state.resolveReport);

  const queue = useMemo(() => getActiveResponderQueue(reports), [reports]);
  const criticalQueue = useMemo(() => getCriticalActiveReports(reports), [reports]);
  const dispatchedReports = useMemo(() => getDispatchedReports(reports), [reports]);
  const verifiedReady = queue.filter(
    (report) => report.status === "Verified" && report.alertState !== "dispatched",
  );

  const [selectedId, setSelectedId] = useState<string>("");
  const [busyAction, setBusyAction] = useState<WorkflowAction>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!queue.some((report) => report.id === selectedId)) {
      setSelectedId(queue[0]?.id ?? "");
    }
  }, [queue, selectedId]);

  const selected = queue.find((report) => report.id === selectedId) ?? queue[0] ?? null;

  async function handleVerify() {
    if (!selected) return;

    setBusyAction("verify");
    setActionError(null);
    setActionMessage(null);

    try {
      await verifyReport(selected.id, {
        severity: selected.ai?.severity ?? selected.severity ?? null,
        department: selected.ai?.suggestedDepartment ?? selected.departmentFilter ?? null,
        verifiedBy: session?.uid ?? null,
      });
      setActionMessage(`${selected.id} verified and routed for field coordination.`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to verify the selected report.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDispatch() {
    if (!selected) return;

    setBusyAction("dispatch");
    setActionError(null);
    setActionMessage(null);

    try {
      await dispatchReport(selected.id);
      setActionMessage(`${selected.id} dispatched to the assigned field team.`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to dispatch the selected report.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleResolve() {
    if (!selected) return;

    setBusyAction("resolve");
    setActionError(null);
    setActionMessage(null);

    try {
      await resolveReport(selected.id);
      setActionMessage(`${selected.id} marked resolved and removed from the active queue.`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to resolve the selected report.");
    } finally {
      setBusyAction(null);
    }
  }

  const canVerify = selected?.status === "Pending Validation";
  const canDispatch = selected?.status === "Verified" && selected?.alertState !== "dispatched";
  const canResolve = selected?.status !== "Resolved" && selected?.alertState === "dispatched";

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Active queue",
            value: queue.length,
            helper: "Resolved incidents are removed automatically",
            tone: "default" as const,
          },
          {
            label: "Critical incidents",
            value: criticalQueue.length,
            helper: "Highest-severity items in live view",
            tone: "danger" as const,
          },
          {
            label: "Ready to dispatch",
            value: verifiedReady.length,
            helper: "Verified cases awaiting team assignment",
            tone: "warning" as const,
          },
          {
            label: "Field deployments",
            value: dispatchedReports.length,
            helper: "Incidents currently marked dispatched",
            tone: "success" as const,
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_minmax(340px,0.82fr)]">
        <Card className="p-6">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-3">
              <Badge>Responder queue</Badge>
              <Badge variant="outline">Severity-first sorting</Badge>
              <Badge variant="danger">{criticalQueue.length} critical open</Badge>
            </div>
            <CardTitle>Live incident queue</CardTitle>
            <CardDescription>
              Reports remain sorted by severity and newest timestamp so responders see the most urgent cases first.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isInitializing && !isReady ? (
              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
                Loading live workflow data...
              </div>
            ) : null}

            {loadError ? (
              <div className="rounded-[24px] border border-danger-400/35 bg-danger-500/12 p-4 text-sm text-danger-100">
                {loadError}
              </div>
            ) : null}

            <IncidentMap
              incidents={queue}
              selectedIncidentId={selected?.id}
              onSelectIncident={setSelectedId}
              className="h-[22rem]"
            />

            <div className="space-y-3">
              {queue.map((report) => (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => setSelectedId(report.id)}
                  className={`w-full rounded-[24px] border p-4 text-left transition ${
                    selected?.id === report.id
                      ? "border-brand-400/35 bg-brand-500/12"
                      : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
                  }`}
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
                      <Badge variant={alertStateBadgeVariant(report.alertState)}>
                        {report.alertState ?? "new"}
                      </Badge>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{report.description}</p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
                    <span>{report.locationName}</span>
                    <span>{formatTimeAgo(report.timestamp)}</span>
                  </div>
                </button>
              ))}

              {queue.length === 0 ? (
                <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
                  No active incidents are waiting in the responder queue right now.
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline">Selected incident</Badge>
              {selected ? (
                <Badge variant={severityBadgeVariant(selected.severity)}>
                  {selected.severity ?? "Medium"}
                </Badge>
              ) : null}
            </div>
            <CardTitle>Incident detail panel</CardTitle>
            <CardDescription>
              Review AI context, confirm routing, and step the incident through verify, dispatch, and resolve actions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selected ? (
              <>
                <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{selected.id}</p>
                      <p className="mt-1 text-2xl font-semibold text-white">
                        {selected.damageType ?? "Incident"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{selected.status}</Badge>
                      <Badge variant={alertStateBadgeVariant(selected.alertState)}>
                        {selected.alertState ?? "new"}
                      </Badge>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-slate-200">{selected.description}</p>
                </div>

                {selected.photoUrl ? (
                  <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04]">
                    <img
                      src={selected.photoUrl}
                      alt="Incident submission"
                      className="h-56 w-full object-cover"
                    />
                  </div>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-sm text-slate-400">Location</p>
                    <p className="mt-2 font-semibold text-white">{selected.locationName}</p>
                    <p className="mt-2 text-xs text-slate-400">
                      {toDisplayCoordinate(selected.lat)}, {toDisplayCoordinate(selected.lng)}
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-sm text-slate-400">Routing</p>
                    <p className="mt-2 font-semibold text-white">{selected.departmentFilter ?? "None"}</p>
                    <p className="mt-2 text-xs text-slate-400">
                      Reported {formatAbsoluteTimestamp(selected.timestamp)}
                    </p>
                  </div>
                </div>

                {selected.ai ? (
                  <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm text-slate-400">AI triage</p>
                        <p className="mt-1 text-lg font-semibold text-white">{selected.ai.summary}</p>
                      </div>
                      <Badge variant="outline">{formatConfidence(selected.ai.confidence)}</Badge>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-300">{selected.ai.rationale}</p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[20px] border border-white/10 bg-panel-900/70 p-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Hazards</p>
                        <div className="mt-3 space-y-2">
                          {selected.ai.hazards.length > 0 ? (
                            selected.ai.hazards.map((hazard) => (
                              <div
                                key={hazard}
                                className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-200"
                              >
                                {hazard}
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-slate-400">No specific hazards returned.</p>
                          )}
                        </div>
                      </div>
                      <div className="rounded-[20px] border border-white/10 bg-panel-900/70 p-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                          Suggested actions
                        </p>
                        <div className="mt-3 space-y-2">
                          {selected.ai.suggestedActions.map((action) => (
                            <div
                              key={action}
                              className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-200"
                            >
                              {action}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-sm text-slate-400">Workflow progress</p>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {REPORT_STATUS_STAGES.map((stage) => {
                      const reached =
                        REPORT_STATUS_STAGES.indexOf(stage) <=
                        REPORT_STATUS_STAGES.indexOf(selected.status);

                      return (
                        <div
                          key={stage}
                          className={`rounded-xl border px-2 py-2 text-center text-xs ${
                            reached
                              ? "border-success-400/35 bg-success-500/14 text-success-100"
                              : "border-white/10 bg-panel-900/80 text-slate-500"
                          }`}
                        >
                          {stage}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {actionError ? (
                  <div className="rounded-[22px] border border-danger-400/35 bg-danger-500/12 p-4 text-sm text-danger-100">
                    {actionError}
                  </div>
                ) : null}

                {actionMessage ? (
                  <div className="rounded-[22px] border border-success-400/35 bg-success-500/12 p-4 text-sm text-success-100">
                    {actionMessage}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => void handleVerify()}
                    disabled={!canVerify || busyAction !== null}
                  >
                    {busyAction === "verify" ? "Verifying..." : "Verify"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => void handleDispatch()}
                    disabled={!canDispatch || busyAction !== null}
                  >
                    {busyAction === "dispatch" ? "Dispatching..." : "Dispatch"}
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => void handleResolve()}
                    disabled={!canResolve || busyAction !== null}
                  >
                    {busyAction === "resolve" ? "Resolving..." : "Resolve"}
                  </Button>
                </div>
              </>
            ) : (
              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
                Select an active incident from the queue to inspect details and apply workflow actions.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
