import { useEffect, useMemo, useState } from "react";
import { IncidentMap } from "../../components/maps/IncidentMap";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { formatConfidence } from "../../lib/confidence";
import {
  alertStateBadgeVariant,
  formatAbsoluteTimestamp,
  getActiveReports,
  getDispatchedReports,
  getPendingReports,
  getResolvedReports,
  getVerifiedReports,
  OPERATIONS_TEAM,
  severityBadgeVariant,
  sortReportsByPriority,
} from "../../lib/operations";
import { REPORT_STATUS_STAGES, formatTimeAgo, toDisplayCoordinate } from "../../lib/reporting";
import { useReportStore } from "../../store/useReportStore";

const ALERT_STATES = ["new", "acknowledged", "dispatched", "resolved"] as const;

const STATUS_DOT: Record<string, string> = {
  "On duty": "bg-success-400",
  Standby: "bg-warning-400",
  "Off duty": "bg-slate-500",
};

export function AdminDashboard() {
  const reports = useReportStore((state) => state.reports);
  const isReady = useReportStore((state) => state.isReady);
  const isInitializing = useReportStore((state) => state.isInitializing);
  const loadError = useReportStore((state) => state.loadError);
  const dispatchReport = useReportStore((state) => state.dispatchReport);
  const resolveReport = useReportStore((state) => state.resolveReport);

  const totalReports = reports.length;
  const pendingReports = useMemo(() => getPendingReports(reports), [reports]);
  const verifiedReports = useMemo(() => getVerifiedReports(reports), [reports]);
  const resolvedReports = useMemo(() => getResolvedReports(reports), [reports]);
  const dispatchedReports = useMemo(() => getDispatchedReports(reports), [reports]);

  const activeReports = useMemo(() => getActiveReports(reports), [reports]);
  const priorityQueue = useMemo(
    () => sortReportsByPriority(activeReports).slice(0, 12),
    [activeReports],
  );

  const verifiedReady = priorityQueue.filter(
    (r) => r.status === "Verified" && r.alertState !== "dispatched",
  );

  const [selectedId, setSelectedId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [assignFeedback, setAssignFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!priorityQueue.some((r) => r.id === selectedId)) {
      setSelectedId(priorityQueue[0]?.id ?? "");
    }
  }, [priorityQueue, selectedId]);

  const selected = priorityQueue.find((r) => r.id === selectedId) ?? priorityQueue[0] ?? null;

  const canDispatch = selected?.status === "Verified" && selected?.alertState !== "dispatched";
  const canResolve = selected?.status !== "Resolved" && selected?.alertState === "dispatched";

  async function handleDispatch() {
    if (!selected) return;
    setBusy(true);
    setFeedback(null);
    try {
      await dispatchReport(selected.id);
      setFeedback(`#${selected.id.slice(-4)} dispatched.`);
    } catch {
      setFeedback("Dispatch failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleResolve() {
    if (!selected) return;
    setBusy(true);
    setFeedback(null);
    try {
      await resolveReport(selected.id);
      setFeedback(`#${selected.id.slice(-4)} resolved.`);
    } catch {
      setFeedback("Resolve failed.");
    } finally {
      setBusy(false);
    }
  }

  function handleAssign(memberName: string) {
    if (!selected) return;
    setAssignFeedback(`Assigned #${selected.id.slice(-4)} → ${memberName}`);
    setTimeout(() => setAssignFeedback(null), 3000);
  }

  return (
    <div className="space-y-6">
      {/* Metric strip — same shape as responder dashboard but with more admin-relevant stats */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.06] sm:grid-cols-3 md:grid-cols-5">
        {[
          { label: "Total Reports", value: totalReports, color: "text-brand-300" },
          { label: "Pending", value: pendingReports.length, color: "text-warning-300" },
          { label: "Ready to Dispatch", value: verifiedReady.length, color: "text-success-300" },
          { label: "Dispatched", value: dispatchedReports.length, color: "text-brand-200" },
          { label: "Resolved", value: resolvedReports.length },
        ].map((m) => (
          <div key={m.label} className="bg-[#0a1628] px-5 py-4">
            <p className="text-3xl font-bold tabular-nums text-white">
              <span className={m.color}>{m.value}</span>
            </p>
            <p className="mt-1 text-xs uppercase tracking-widest text-slate-500">{m.label}</p>
          </div>
        ))}
      </div>

      {isInitializing && !isReady ? (
        <p className="text-sm text-slate-500">Loading reports...</p>
      ) : null}

      {loadError ? (
        <p className="text-sm text-danger-300">{loadError}</p>
      ) : null}

      {/* Same two-column layout as responder dashboard: left = map + queue, right = detail */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.18fr)_minmax(300px,0.82fr)] xl:grid-cols-[minmax(0,1.18fr)_minmax(340px,0.82fr)]">
        {/* Left column: Map + queue table */}
        <div className="space-y-4">
          {/* Map */}
          <div className="overflow-hidden rounded-lg border border-white/[0.06]">
            <IncidentMap
              incidents={activeReports}
              selectedIncidentId={selected?.id}
              onSelectIncident={setSelectedId}
              className="h-[14rem] sm:h-[18rem] lg:h-[20rem]"
            />
          </div>

          {/* Incident table */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Incident Queue</h2>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-success-400 animate-pulse" />
                  Live
                </span>
                <span className="text-xs text-slate-500">{priorityQueue.length} active</span>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-white/[0.06]">
              <div className="overflow-x-auto">
                <div className="min-w-[480px]">
                  <div className="grid grid-cols-[72px_1fr_90px_80px_80px] gap-2 border-b border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-[11px] uppercase tracking-widest text-slate-500">
                    <span>ID</span>
                    <span>Incident</span>
                    <span>Severity</span>
                    <span className="hidden sm:block">Status</span>
                    <span className="hidden sm:block">Time</span>
                  </div>

                  {priorityQueue.length > 0 ? (
                    priorityQueue.map((report) => (
                      <button
                        key={report.id}
                        type="button"
                        onClick={() => { setSelectedId(report.id); setFeedback(null); setAssignFeedback(null); }}
                        className={`grid w-full grid-cols-[72px_1fr_90px_80px_80px] items-center gap-2 border-b border-white/[0.04] px-4 py-3 text-left text-sm transition ${
                          selected?.id === report.id
                            ? "bg-brand-500/8"
                            : "bg-[#0a1628] hover:bg-white/[0.03]"
                        }`}
                      >
                        <span className="font-mono text-xs text-brand-300">#{report.id.slice(-4)}</span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-white">{report.damageType ?? "Incident"}</p>
                          <p className="truncate text-xs text-slate-500">{report.locationName}</p>
                        </div>
                        <Badge variant={severityBadgeVariant(report.severity)} className="w-fit text-[10px]">
                          {report.severity ?? "Medium"}
                        </Badge>
                        <Badge variant={alertStateBadgeVariant(report.alertState)} className="hidden w-fit text-[10px] sm:inline-flex">
                          {report.alertState ?? "new"}
                        </Badge>
                        <span className="hidden text-xs text-slate-500 sm:block">{formatTimeAgo(report.timestamp)}</span>
                      </button>
                    ))
                  ) : (
                    <div className="bg-[#0a1628] px-4 py-6 text-center text-sm text-slate-500">
                      No active incidents.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Detail panel — mirrors responder dashboard detail but adds admin actions */}
        <div>
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-white">Incident Detail</h2>
          </div>

          <div className="rounded-lg border border-white/[0.06] bg-[#0a1628] p-4">
            {selected ? (
              <div className="space-y-4">
                {/* Header */}
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-mono text-xs text-brand-300">#{selected.id.slice(-4)}</p>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-[10px]">{selected.status}</Badge>
                      <Badge variant={alertStateBadgeVariant(selected.alertState)} className="text-[10px]">
                        {selected.alertState ?? "new"}
                      </Badge>
                    </div>
                  </div>
                  <p className="mt-1 text-lg font-semibold text-white">{selected.damageType ?? "Incident"}</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{selected.description}</p>
                </div>

                {/* Photo */}
                {selected.photoUrl ? (
                  <div className="overflow-hidden rounded-lg border border-white/[0.06]">
                    <img src={selected.photoUrl} alt="Incident" className="h-44 w-full object-cover" />
                  </div>
                ) : null}

                {/* Location + routing */}
                <div className="grid grid-cols-2 gap-3 border-t border-white/[0.06] pt-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-slate-500">Location</p>
                    <p className="mt-1 text-sm font-medium text-white">{selected.locationName}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {toDisplayCoordinate(selected.lat)}, {toDisplayCoordinate(selected.lng)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-slate-500">Routing</p>
                    <p className="mt-1 text-sm font-medium text-white">{selected.departmentFilter ?? "None"}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{formatAbsoluteTimestamp(selected.timestamp)}</p>
                  </div>
                </div>

                {/* AI triage */}
                {selected.ai ? (
                  <div className="border-t border-white/[0.06] pt-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] uppercase tracking-widest text-slate-500">AI Triage</p>
                      <span className="text-xs text-slate-400">{formatConfidence(selected.ai.confidence)}</span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-white">{selected.ai.summary}</p>

                    {/* Confidence bar */}
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-500 to-success-400 transition-all"
                        style={{ width: `${Math.round((selected.ai.confidence ?? 0) * 100)}%` }}
                      />
                    </div>

                    <p className="mt-2 text-xs leading-relaxed text-slate-500">{selected.ai.rationale}</p>

                    {selected.ai.hazards.length > 0 ? (
                      <div className="mt-3">
                        <p className="text-[10px] uppercase tracking-widest text-slate-500">Hazards</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {selected.ai.hazards.map((h) => (
                            <span key={h} className="rounded border border-danger-400/20 bg-danger-500/8 px-2 py-1 text-xs text-danger-200">
                              {h}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {selected.ai.suggestedActions.length > 0 ? (
                      <div className="mt-3">
                        <p className="text-[10px] uppercase tracking-widest text-slate-500">Suggested Actions</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {selected.ai.suggestedActions.map((a) => (
                            <span key={a} className="rounded border border-brand-400/20 bg-brand-500/8 px-2 py-1 text-xs text-brand-200">
                              {a}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {/* Workflow progress */}
                <div className="border-t border-white/[0.06] pt-4">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500">Report Status</p>
                  <div className="mt-2 grid grid-cols-3 gap-1">
                    {REPORT_STATUS_STAGES.map((stage) => {
                      const reached =
                        REPORT_STATUS_STAGES.indexOf(stage) <=
                        REPORT_STATUS_STAGES.indexOf(selected.status);
                      return (
                        <div
                          key={stage}
                          className={`rounded border px-2 py-1.5 text-center text-[10px] uppercase tracking-wider ${
                            reached
                              ? "border-success-400/30 bg-success-500/10 text-success-300"
                              : "border-white/[0.06] text-slate-600"
                          }`}
                        >
                          {stage}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Alert state timeline */}
                <div className="border-t border-white/[0.06] pt-4">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500">Alert Timeline</p>
                  <div className="mt-3 flex items-start gap-0">
                    {ALERT_STATES.map((state, i) => {
                      const currentIdx = ALERT_STATES.indexOf(
                        (selected.alertState as typeof ALERT_STATES[number]) ?? "new",
                      );
                      const reached = i <= currentIdx;
                      const timestamp =
                        state === "dispatched" ? selected.dispatchedAt :
                        state === "resolved" ? selected.resolvedAt :
                        state === "new" ? selected.timestamp :
                        null;
                      return (
                        <div key={state} className="flex flex-1 flex-col items-center">
                          <div className="flex w-full items-center">
                            {i > 0 ? (
                              <div className={`h-0.5 flex-1 ${reached ? "bg-brand-400" : "bg-white/[0.08]"}`} />
                            ) : <div className="flex-1" />}
                            <div
                              className={`h-3 w-3 shrink-0 rounded-full border-2 ${
                                reached
                                  ? "border-brand-400 bg-brand-500"
                                  : "border-white/[0.12] bg-transparent"
                              }`}
                            />
                            {i < ALERT_STATES.length - 1 ? (
                              <div className={`h-0.5 flex-1 ${i < currentIdx ? "bg-brand-400" : "bg-white/[0.08]"}`} />
                            ) : <div className="flex-1" />}
                          </div>
                          <p className={`mt-1.5 text-[9px] uppercase tracking-wider ${reached ? "text-brand-300" : "text-slate-600"}`}>
                            {state}
                          </p>
                          {timestamp ? (
                            <p className="text-[9px] text-slate-500">{formatAbsoluteTimestamp(timestamp)}</p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {feedback ? (
                  <p className="text-sm text-success-300">{feedback}</p>
                ) : null}

                {/* Admin actions — this is what makes it more comprehensive than responder */}
                <div className="flex gap-3 border-t border-white/[0.06] pt-4">
                  <Button
                    size="sm"
                    onClick={() => void handleDispatch()}
                    disabled={!canDispatch || busy}
                  >
                    {busy ? "..." : "Dispatch"}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => void handleResolve()}
                    disabled={!canResolve || busy}
                  >
                    {busy ? "..." : "Resolve"}
                  </Button>
                </div>

                {/* Field assignment */}
                <div className="border-t border-white/[0.06] pt-4">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500">Field Assignment</p>
                  {assignFeedback ? (
                    <p className="mt-2 text-sm text-success-300">{assignFeedback}</p>
                  ) : null}
                  <div className="mt-2 space-y-1">
                    {OPERATIONS_TEAM.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[member.status] ?? "bg-slate-500"}`} />
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-white">{member.name}</p>
                            <p className="truncate text-[10px] text-slate-500">{member.title} — {member.org}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAssign(member.name)}
                          className="shrink-0 rounded-md border border-brand-400/20 bg-brand-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-brand-300 transition hover:bg-brand-500/20"
                        >
                          Assign
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-slate-500">
                Select an incident to view details.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
