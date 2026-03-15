import { useEffect, useMemo, useState } from "react";
import { IncidentMap } from "../components/maps/IncidentMap";
import { Badge } from "../components/ui/Badge";
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
import { useReportStore } from "../store/useReportStore";

export function Dashboard() {
  const reports = useReportStore((state) => state.reports);
  const isReady = useReportStore((state) => state.isReady);
  const isInitializing = useReportStore((state) => state.isInitializing);
  const loadError = useReportStore((state) => state.loadError);

  const queue = useMemo(() => getActiveResponderQueue(reports), [reports]);
  const criticalQueue = useMemo(() => getCriticalActiveReports(reports), [reports]);
  const dispatchedReports = useMemo(() => getDispatchedReports(reports), [reports]);
  const verifiedReady = queue.filter(
    (report) => report.status === "Verified" && report.alertState !== "dispatched",
  );

  const [selectedId, setSelectedId] = useState<string>("");

  useEffect(() => {
    if (!queue.some((report) => report.id === selectedId)) {
      setSelectedId(queue[0]?.id ?? "");
    }
  }, [queue, selectedId]);

  const selected = queue.find((report) => report.id === selectedId) ?? queue[0] ?? null;

  return (
    <div className="space-y-6">
      {/* Flat metric strip */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.06] md:grid-cols-4">
        {[
          { label: "Active Queue", value: queue.length },
          { label: "Critical", value: criticalQueue.length, color: "text-danger-300" },
          { label: "Ready to Dispatch", value: verifiedReady.length, color: "text-warning-300" },
          { label: "Dispatched", value: dispatchedReports.length, color: "text-success-300" },
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
        <p className="text-sm text-slate-500">Loading...</p>
      ) : null}

      {loadError ? (
        <p className="text-sm text-danger-300">{loadError}</p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_minmax(340px,0.82fr)]">
        {/* Queue + map */}
        <div className="space-y-4">
          {/* Map */}
          <div className="overflow-hidden rounded-lg border border-white/[0.06]">
            <IncidentMap
              incidents={queue}
              selectedIncidentId={selected?.id}
              onSelectIncident={setSelectedId}
              className="h-[20rem]"
            />
          </div>

          {/* Incident table */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Incident Queue</h2>
              <span className="text-xs text-slate-500">{queue.length} active</span>
            </div>

            <div className="overflow-hidden rounded-lg border border-white/[0.06]">
              <div className="grid grid-cols-[72px_1fr_90px_80px_80px] gap-2 border-b border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-[11px] uppercase tracking-widest text-slate-500">
                <span>ID</span>
                <span>Incident</span>
                <span>Severity</span>
                <span>Status</span>
                <span>Time</span>
              </div>

              {queue.length > 0 ? (
                queue.map((report) => (
                  <button
                    key={report.id}
                    type="button"
                    onClick={() => setSelectedId(report.id)}
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
                    <Badge variant={alertStateBadgeVariant(report.alertState)} className="w-fit text-[10px]">
                      {report.alertState ?? "new"}
                    </Badge>
                    <span className="text-xs text-slate-500">{formatTimeAgo(report.timestamp)}</span>
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

        {/* Detail panel (read-only) */}
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
                    <p className="mt-2 text-xs leading-relaxed text-slate-500">{selected.ai.rationale}</p>

                    {selected.ai.hazards.length > 0 ? (
                      <div className="mt-3">
                        <p className="text-[10px] uppercase tracking-widest text-slate-500">Hazards</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {selected.ai.hazards.map((h) => (
                            <span key={h} className="rounded border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-xs text-slate-300">
                              {h}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {selected.ai.suggestedActions.length > 0 ? (
                      <div className="mt-3">
                        <p className="text-[10px] uppercase tracking-widest text-slate-500">Actions</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {selected.ai.suggestedActions.map((a) => (
                            <span key={a} className="rounded border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-xs text-slate-300">
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
                  <p className="text-[10px] uppercase tracking-widest text-slate-500">Progress</p>
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
