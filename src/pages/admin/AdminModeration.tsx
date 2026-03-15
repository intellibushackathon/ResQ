import { useEffect, useMemo, useState } from "react";
import { IncidentMap } from "../../components/maps/IncidentMap";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { formatConfidence } from "../../lib/confidence";
import {
  formatAbsoluteTimestamp,
  getPendingValidationQueue,
  isAutoConfirmEligible,
  severityBadgeVariant,
} from "../../lib/operations";
import {
  DEPARTMENT_ORDER,
  SEVERITY_ORDER,
  type DepartmentFilter,
  type Severity,
} from "../../lib/reporting";
import { useAuthStore } from "../../store/useAuthStore";
import { useReportStore } from "../../store/useReportStore";

export function AdminModeration() {
  const session = useAuthStore((state) => state.session);
  const reports = useReportStore((state) => state.reports);
  const adminSettings = useReportStore((state) => state.adminSettings);
  const verifyReport = useReportStore((state) => state.verifyReport);

  const pendingQueue = useMemo(() => getPendingValidationQueue(reports), [reports]);

  const [selectedId, setSelectedId] = useState<string>("");
  const [overrideSeverity, setOverrideSeverity] = useState<Severity>("Medium");
  const [overrideDepartment, setOverrideDepartment] = useState<DepartmentFilter>("None");
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingQueue.some((report) => report.id === selectedId)) {
      setSelectedId(pendingQueue[0]?.id ?? "");
    }
  }, [pendingQueue, selectedId]);

  const selected = pendingQueue.find((report) => report.id === selectedId) ?? pendingQueue[0] ?? null;

  useEffect(() => {
    if (!selected) return;
    setOverrideSeverity(selected.severity ?? selected.ai?.severity ?? "Medium");
    setOverrideDepartment(selected.departmentFilter ?? selected.ai?.suggestedDepartment ?? "None");
  }, [selected]);

  async function handleVerify(useAi: boolean) {
    if (!selected) return;
    setIsSaving(true);
    setFeedback(null);
    setErrorMessage(null);

    try {
      const severity = useAi ? selected.ai?.severity ?? overrideSeverity : overrideSeverity;
      const department = useAi ? selected.ai?.suggestedDepartment ?? overrideDepartment : overrideDepartment;

      await verifyReport(selected.id, {
        severity,
        department,
        verifiedBy: session?.uid ?? null,
      });

      setFeedback(useAi ? `${selected.id} verified via AI.` : `${selected.id} verified with overrides.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Verification failed.");
    } finally {
      setIsSaving(false);
    }
  }

  const autoEligible = selected ? isAutoConfirmEligible(selected, adminSettings.autoConfirm) : false;

  return (
    <div className="space-y-6">
      {/* Metric strip */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.06] sm:grid-cols-2 md:grid-cols-4">
        <div className="bg-[#0a1628] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warning-500/10 text-warning-300">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-warning-300">{pendingQueue.length}</p>
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Pending</p>
            </div>
          </div>
        </div>
        <div className="bg-[#0a1628] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-300">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-white">
                {adminSettings.autoConfirm ? "Hybrid" : "Manual"}
              </p>
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Review Mode</p>
            </div>
          </div>
        </div>
        <div className="bg-[#0a1628] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success-500/10 text-success-300">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-success-300">
                {pendingQueue.filter((r) => isAutoConfirmEligible(r, adminSettings.autoConfirm)).length}
              </p>
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Auto-eligible</p>
            </div>
          </div>
        </div>
        <div className="bg-[#0a1628] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-danger-500/10 text-danger-300">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-danger-300">
                {pendingQueue.filter((r) => r.severity === "Critical" || r.severity === "High").length}
              </p>
              <p className="text-[10px] uppercase tracking-widest text-slate-500">High Priority</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending incidents map */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Pending Incidents</h2>
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-warning-400 animate-pulse" />
            {pendingQueue.length} awaiting review
          </span>
        </div>
        <div className="overflow-hidden rounded-lg border border-white/[0.06]">
          <IncidentMap
            incidents={pendingQueue}
            selectedIncidentId={selected?.id}
            onSelectIncident={setSelectedId}
            className="h-[10rem] sm:h-[13rem]"
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(300px,1.05fr)] xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)]">
        {/* Queue table */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Moderation Queue</h2>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-warning-400 animate-pulse" />
                {pendingQueue.length} pending
              </span>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-white/[0.06]">
            <div className="overflow-x-auto">
              <div className="min-w-[460px]">
                <div className="grid grid-cols-[72px_1fr_90px_64px_90px] gap-2 border-b border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-[11px] uppercase tracking-widest text-slate-500">
                  <span>ID</span>
                  <span>Source / Intent</span>
                  <span>Risk Level</span>
                  <span className="hidden sm:block">AI</span>
                  <span className="hidden sm:block">Timestamp</span>
                </div>

                {pendingQueue.length > 0 ? (
                  pendingQueue.map((report) => {
                    const isAutoOk = isAutoConfirmEligible(report, adminSettings.autoConfirm);
                    return (
                      <button
                        key={report.id}
                        type="button"
                        onClick={() => setSelectedId(report.id)}
                        className={`grid w-full grid-cols-[72px_1fr_90px_64px_90px] items-center gap-2 border-b border-white/[0.04] px-4 py-3 text-left text-sm transition ${
                          selected?.id === report.id
                            ? "bg-brand-500/8 border-l-2 border-l-brand-400"
                            : "bg-[#0a1628] hover:bg-white/[0.03]"
                        }`}
                      >
                        <span className="font-mono text-xs text-brand-300">#{report.id.slice(-4)}</span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-white">{report.damageType ?? "Incident"}</p>
                          <p className="truncate text-xs text-slate-500">{report.description}</p>
                        </div>
                        <Badge variant={severityBadgeVariant(report.severity)} className="w-fit text-[10px]">
                          {report.severity ?? "Medium"}
                        </Badge>
                        <span className={`hidden text-xs font-medium sm:block ${isAutoOk ? "text-success-300" : "text-slate-500"}`}>
                          {isAutoOk ? "Ready" : "Manual"}
                        </span>
                        <span className="hidden text-xs text-slate-500 sm:block">{formatAbsoluteTimestamp(report.timestamp)}</span>
                      </button>
                    );
                  })
                ) : (
                  <div className="bg-[#0a1628] px-4 py-6 text-center text-sm text-slate-500">
                    No pending reports.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Detail + verification panel */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Verification</h2>
            {selected ? (
              <span className="text-xs text-brand-300 font-mono">#{selected.id.slice(-4)}</span>
            ) : null}
          </div>

          <div className="rounded-lg border border-white/[0.06] bg-[#0a1628]">
            {selected ? (
              <div>
                {/* Photo */}
                {selected.photoUrl ? (
                  <div className="border-b border-white/[0.06]">
                    <img src={selected.photoUrl} alt="Evidence" className="h-40 w-full object-cover" />
                  </div>
                ) : null}

                <div className="space-y-4 p-4">
                  {/* Incident info */}
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-lg font-semibold text-white">{selected.damageType ?? "Incident"}</p>
                      <Badge variant={severityBadgeVariant(selected.severity)} className="text-[10px]">
                        {selected.severity ?? "Medium"}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">{selected.description}</p>
                    <p className="mt-2 text-xs text-slate-500">{selected.locationName}</p>
                  </div>

                  {/* AI recommendation */}
                  {selected.ai ? (
                    <div className="border-t border-white/[0.06] pt-4">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] uppercase tracking-widest text-slate-500">AI Recommendation</p>
                        <span className="text-xs font-medium text-brand-300">{formatConfidence(selected.ai.confidence)}</span>
                      </div>

                      {/* Confidence bar */}
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-success-400 transition-all"
                          style={{ width: `${Math.round((selected.ai.confidence ?? 0) * 100)}%` }}
                        />
                      </div>

                      <p className="mt-3 text-sm font-medium text-white">{selected.ai.summary}</p>

                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-slate-500">Severity</p>
                          <p className="mt-1 text-sm font-medium text-warning-200">{selected.ai.severity}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-slate-500">Department</p>
                          <p className="mt-1 text-sm font-medium text-brand-200">{selected.ai.suggestedDepartment}</p>
                        </div>
                      </div>

                      <p className="mt-3 text-xs leading-relaxed text-slate-500">{selected.ai.rationale}</p>

                      {/* Hazards */}
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

                      {/* Suggested actions */}
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

                  {/* Override controls */}
                  <div className="grid grid-cols-2 gap-3 border-t border-white/[0.06] pt-4">
                    <label className="space-y-1.5">
                      <span className="text-[10px] uppercase tracking-widest text-slate-500">Severity Override</span>
                      <select
                        value={overrideSeverity}
                        onChange={(e) => setOverrideSeverity(e.target.value as Severity)}
                        className="h-9 w-full rounded-lg border border-white/[0.08] bg-[#0d1a2e] px-2.5 text-sm text-slate-200 focus:border-brand-400/40 focus:outline-none"
                      >
                        {SEVERITY_ORDER.map((s) => (
                          <option key={s} value={s} className="bg-[#0d1a2e]">{s}</option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-[10px] uppercase tracking-widest text-slate-500">Department Override</span>
                      <select
                        value={overrideDepartment}
                        onChange={(e) => setOverrideDepartment(e.target.value as DepartmentFilter)}
                        className="h-9 w-full rounded-lg border border-white/[0.08] bg-[#0d1a2e] px-2.5 text-sm text-slate-200 focus:border-brand-400/40 focus:outline-none"
                      >
                        {DEPARTMENT_ORDER.map((d) => (
                          <option key={d} value={d} className="bg-[#0d1a2e]">{d}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 border-t border-white/[0.06] pt-4">
                    <Button size="sm" onClick={() => void handleVerify(false)} disabled={isSaving}>
                      {isSaving ? "..." : "Verify & Approve"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (!selected?.ai) return;
                        setOverrideSeverity(selected.ai.severity);
                        setOverrideDepartment(selected.ai.suggestedDepartment);
                      }}
                      disabled={!selected.ai || isSaving}
                    >
                      Use AI Values
                    </Button>
                    {autoEligible ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleVerify(true)}
                        disabled={isSaving}
                        className="text-success-300"
                      >
                        Auto-confirm
                      </Button>
                    ) : null}
                  </div>

                  {errorMessage ? <p className="text-sm text-danger-300">{errorMessage}</p> : null}
                  {feedback ? <p className="text-sm text-success-300">{feedback}</p> : null}
                </div>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">
                Select a report to review.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
