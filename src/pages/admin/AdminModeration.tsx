import { useEffect, useMemo, useState } from "react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
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
  const isInitializing = useReportStore((state) => state.isInitializing);

  const pendingQueue = useMemo(() => getPendingValidationQueue(reports), [reports]);
  const autoEligibleCount = pendingQueue.filter((report) =>
    isAutoConfirmEligible(report, adminSettings.autoConfirm),
  ).length;

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

  async function handleVerify(useAiRecommendation: boolean) {
    if (!selected) return;

    setIsSaving(true);
    setFeedback(null);
    setErrorMessage(null);

    try {
      const severity = useAiRecommendation
        ? selected.ai?.severity ?? overrideSeverity
        : overrideSeverity;
      const department = useAiRecommendation
        ? selected.ai?.suggestedDepartment ?? overrideDepartment
        : overrideDepartment;

      await verifyReport(selected.id, {
        severity,
        department,
        verifiedBy: session?.uid ?? null,
      });

      setFeedback(
        useAiRecommendation
          ? `${selected.id} verified using the AI recommendation path.`
          : `${selected.id} verified with moderation overrides applied.`,
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to verify the selected incident.");
    } finally {
      setIsSaving(false);
    }
  }

  const autoEligible = selected ? isAutoConfirmEligible(selected, adminSettings.autoConfirm) : false;

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            label: "Pending validation",
            value: pendingQueue.length,
            helper: "Reports waiting for moderation review",
            tone: "warning" as const,
          },
          {
            label: "Auto-confirm eligible",
            value: autoEligibleCount,
            helper: adminSettings.autoConfirm
              ? "Confidence meets the configured threshold"
              : "Enable auto-confirm in system controls",
            tone: adminSettings.autoConfirm ? ("success" as const) : ("outline" as const),
          },
          {
            label: "Manual review mode",
            value: adminSettings.autoConfirm ? "Hybrid" : "Manual",
            helper: "Moderators can still override severity and department",
            tone: "default" as const,
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)]">
        <Card className="p-6">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="warning">Moderation queue</Badge>
              <Badge variant="outline">Pending only</Badge>
            </div>
            <CardTitle>Validation workload</CardTitle>
            <CardDescription>
              Review the newest high-severity reports first and move them into the verified workflow.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isInitializing ? (
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
                Refreshing moderation queue...
              </div>
            ) : null}

            {pendingQueue.map((report) => {
              const eligible = isAutoConfirmEligible(report, adminSettings.autoConfirm);

              return (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => setSelectedId(report.id)}
                  className={`w-full rounded-lg border p-4 text-left transition ${
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
                      {eligible ? <Badge variant="success">Auto-confirm</Badge> : null}
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{report.description}</p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
                    <span>{report.locationName}</span>
                    <span>{formatAbsoluteTimestamp(report.timestamp)}</span>
                  </div>
                </button>
              );
            })}

            {pendingQueue.length === 0 ? (
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
                No pending validation reports remain in the moderation queue.
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline">Verification workflow</Badge>
              {autoEligible ? <Badge variant="success">AI threshold met</Badge> : null}
            </div>
            <CardTitle>Moderation detail</CardTitle>
            <CardDescription>
              Apply severity and department overrides when needed before moving the report into verified status.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selected ? (
              <>
                <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{selected.id}</p>
                      <p className="mt-1 text-2xl font-semibold text-white">
                        {selected.damageType ?? "Incident"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={severityBadgeVariant(selected.severity)}>
                        {selected.severity ?? "Medium"}
                      </Badge>
                      <Badge variant="outline">{selected.locationName}</Badge>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-slate-200">{selected.description}</p>
                </div>

                {selected.photoUrl ? (
                  <div className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.04]">
                    <img
                      src={selected.photoUrl}
                      alt="Incident evidence"
                      className="h-56 w-full object-cover"
                    />
                  </div>
                ) : null}

                {selected.ai ? (
                  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm text-slate-400">AI recommendation</p>
                        <p className="mt-1 text-lg font-semibold text-white">{selected.ai.summary}</p>
                      </div>
                      <Badge variant="outline">{formatConfidence(selected.ai.confidence)}</Badge>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[20px] border border-white/10 bg-panel-900/70 p-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Severity</p>
                        <p className="mt-2 font-semibold text-white">{selected.ai.severity}</p>
                      </div>
                      <div className="rounded-[20px] border border-white/10 bg-panel-900/70 p-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Department</p>
                        <p className="mt-2 font-semibold text-white">{selected.ai.suggestedDepartment}</p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-slate-300">{selected.ai.rationale}</p>
                  </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="section-label">Severity override</span>
                    <select
                      value={overrideSeverity}
                      onChange={(event) => setOverrideSeverity(event.target.value as Severity)}
                      className="h-11 w-full rounded-xl border border-white/15 bg-panel-900/60 px-3 text-sm text-slate-100"
                    >
                      {SEVERITY_ORDER.map((severity) => (
                        <option key={severity} value={severity}>
                          {severity}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="section-label">Department override</span>
                    <select
                      value={overrideDepartment}
                      onChange={(event) => setOverrideDepartment(event.target.value as DepartmentFilter)}
                      className="h-11 w-full rounded-xl border border-white/15 bg-panel-900/60 px-3 text-sm text-slate-100"
                    >
                      {DEPARTMENT_ORDER.map((department) => (
                        <option key={department} value={department}>
                          {department}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => void handleVerify(false)}
                    disabled={isSaving}
                  >
                    {isSaving ? "Saving..." : "Verify with overrides"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!selected?.ai) return;
                      setOverrideSeverity(selected.ai.severity);
                      setOverrideDepartment(selected.ai.suggestedDepartment);
                    }}
                    disabled={!selected.ai || isSaving}
                  >
                    Use AI values
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => void handleVerify(true)}
                    disabled={!selected.ai || !autoEligible || isSaving}
                  >
                    Confirm AI recommendation
                  </Button>
                </div>

                {errorMessage ? (
                  <div className="rounded-lg border border-danger-400/35 bg-danger-500/12 p-4 text-sm text-danger-100">
                    {errorMessage}
                  </div>
                ) : null}

                {feedback ? (
                  <div className="rounded-lg border border-success-400/35 bg-success-500/12 p-4 text-sm text-success-100">
                    {feedback}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
                Select a pending report to review AI output and apply moderation decisions.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
