import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { LocationPickerMap } from "../components/maps/LocationPickerMap";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/Card";
import { formatConfidence, getConfidenceTier } from "../lib/confidence";
import { reverseGeocode } from "../lib/geocoding";
import { getCurrentLocation, KINGSTON_FALLBACK } from "../lib/geolocation";
import {
  DAMAGE_TYPES,
  DEPARTMENT_ORDER,
  SEVERITY_ORDER,
  type DamageTypeOption,
  type ReportAIAnalysis,
  type ReportSubmissionResult,
} from "../lib/reporting";
import { useAuthStore } from "../store/useAuthStore";
import { useReportStore } from "../store/useReportStore";

export function SubmitReport() {
  const session = useAuthStore((state) => state.session);
  const addReport = useReportStore((state) => state.addReport);
  const adminSettings = useReportStore((state) => state.adminSettings);
  const isSubmitting = useReportStore((state) => state.isSubmitting);
  const submissionPhase = useReportStore((state) => state.submissionPhase);
  const submissionError = useReportStore((state) => state.submissionError);
  const offlineQueueCount = useReportStore((state) => state.offlineQueue.length);
  const isSyncingOfflineQueue = useReportStore((state) => state.isSyncingOfflineQueue);
  const syncStatusMessage = useReportStore((state) => state.syncStatusMessage);

  const [isOnline, setIsOnline] = useState<boolean>(() => navigator.onLine);
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [damageType, setDamageType] = useState<DamageTypeOption>("Flooding");
  const [description, setDescription] = useState("");
  const [lat, setLat] = useState(KINGSTON_FALLBACK.lat);
  const [lng, setLng] = useState(KINGSTON_FALLBACK.lng);
  const [locationName, setLocationName] = useState("Pinned Incident Location");
  const [urgentAssist, setUrgentAssist] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [latestResult, setLatestResult] = useState<ReportSubmissionResult | null>(null);

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  async function resolveLocation(nextLat: number, nextLng: number) {
    setLat(nextLat);
    setLng(nextLng);
    setLatestResult(null);
    setIsResolvingLocation(true);
    const resolved = await reverseGeocode(nextLat, nextLng);
    setLocationName(resolved.label);
    setIsResolvingLocation(false);
  }

  const onPhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setPhotoFile(null);
      return;
    }

    try {
      await file.arrayBuffer();
      if (!file.type.startsWith("image/")) {
        throw new Error("invalid");
      }
      setPhotoFile(file);
      setLocalError(null);
      setLatestResult(null);
    } catch {
      setPhotoFile(null);
      setLocalError("The selected file could not be read as an image.");
    }
  };

  const handleLocate = async () => {
    setLocalError(null);
    const resolved = await getCurrentLocation();
    await resolveLocation(resolved.lat, resolved.lng);
  };

  const handleSelectLocation = async (nextLocation: { lat: number; lng: number }) => {
    await resolveLocation(nextLocation.lat, nextLocation.lng);
  };

  const validate = () => {
    if (!photoFile) {
      setLocalError("The selected file could not be read as an image.");
      return false;
    }

    if (!description.trim()) {
      setLocalError("Description is required.");
      return false;
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
      setLocalError("Failed to submit");
      return false;
    }

    return true;
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);

    if (!validate() || !photoFile) {
      return;
    }

    try {
      const result = await addReport(
        {
          photoFile,
          damageType,
          description: description.trim(),
          lat,
          lng,
          locationName,
          urgentAssist,
        },
        session,
      );

      setLatestResult(result);
      setPhotoFile(null);
      setDescription("");
      setDamageType("Flooding");
      setUrgentAssist(false);
      setFileInputKey((value) => value + 1);
    } catch (error) {
      if (error instanceof Error) {
        setLocalError(error.message);
      } else {
        setLocalError("Failed to submit");
      }
    }
  };

  const busyLabel =
    submissionPhase === "analyzing"
      ? "Analyzing"
      : submissionPhase === "submitting"
        ? "Submitting"
        : "Submit report";

  const activeAnalysis: ReportAIAnalysis | null = latestResult?.report.ai ?? null;
  const submittedDamageType = latestResult?.report.damageType ?? activeAnalysis?.damageType ?? null;
  const confidenceTier = getConfidenceTier(activeAnalysis?.confidence);
  const submissionStatusMessage = adminSettings.lockdownMode
    ? "Submissions are currently disabled by system controls."
    : isSyncingOfflineQueue
      ? "Syncing queued reports"
      : offlineQueueCount > 0
        ? `${offlineQueueCount} queued for sync`
        : isOnline
          ? "Connected. Reports submit instantly when validation passes."
          : "Queued for sync when online";

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
      <Card className="p-6 sm:p-7">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <Badge>Incident intake</Badge>
            <Badge variant={urgentAssist ? "danger" : "outline"}>
              {urgentAssist ? "Urgent assist requested" : "Standard priority"}
            </Badge>
            <Badge variant={isOnline ? "success" : "warning"}>{isOnline ? "Online" : "Offline"}</Badge>
            {adminSettings.lockdownMode ? <Badge variant="danger">Lockdown mode</Badge> : null}
          </div>
          <CardTitle className="text-3xl sm:text-[2rem]">Submit an incident report</CardTitle>
          <CardDescription className="max-w-3xl text-base leading-7">
            Share a photo, location, and description so response teams can triage quickly, even when connectivity is unstable.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form className="space-y-5" onSubmit={onSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                <span className="section-label mb-2 block">Photo upload</span>
                <input
                  key={fileInputKey}
                  required
                  type="file"
                  accept="image/*"
                  onChange={onPhotoChange}
                  className="w-full rounded-xl border border-white/15 bg-panel-900/50 px-3 py-2 text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-brand-500 file:px-3 file:py-2 file:text-xs file:font-semibold file:uppercase file:tracking-[0.2em] file:text-white"
                />
                <p className="mt-2 text-xs text-slate-400">
                  {photoFile ? `Selected: ${photoFile.name}` : "A clear scene image is required."}
                </p>
              </label>

              <label className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                <span className="section-label mb-2 block">Damage type</span>
                <select
                  value={damageType}
                  onChange={(event) => {
                    setDamageType(event.target.value as DamageTypeOption);
                    setLatestResult(null);
                  }}
                  className="w-full rounded-xl border border-white/15 bg-panel-900/60 px-3 py-2 text-sm text-slate-100"
                >
                  {DAMAGE_TYPES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <span className="section-label mb-2 block">Description</span>
              <textarea
                required
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                  setLatestResult(null);
                }}
                placeholder="Describe what happened, who is affected, and any immediate hazards."
                className="min-h-28 w-full rounded-xl border border-white/15 bg-panel-900/60 px-3 py-3 text-sm text-slate-100 placeholder:text-slate-500"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-[1fr_auto]">
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="section-label">GPS and map pin</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => void handleLocate()} disabled={isSubmitting}>
                    Locate
                  </Button>
                </div>
                <LocationPickerMap
                  mapCenter={{ lat, lng }}
                  incidentLocation={{ lat, lng }}
                  onSelectLocation={(nextLocation) => void handleSelectLocation(nextLocation)}
                />
                <p className="mt-3 text-sm text-slate-300">
                  {isResolvingLocation ? "Resolving location..." : locationName}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Lat {lat.toFixed(6)} | Lng {lng.toFixed(6)}
                </p>
              </div>

              <label className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.04] px-4 py-3 md:self-start">
                <input
                  type="checkbox"
                  checked={urgentAssist}
                  onChange={(event) => {
                    setUrgentAssist(event.target.checked);
                    setLatestResult(null);
                  }}
                  className="h-4 w-4 rounded border-white/30 bg-panel-900"
                />
                <span className="text-sm font-semibold text-white">Request urgent assist</span>
              </label>
            </div>

            {localError || submissionError ? (
              <div className="rounded-2xl border border-danger-400/40 bg-danger-500/15 px-4 py-3 text-sm text-danger-100">
                {localError || submissionError}
              </div>
            ) : null}

            {syncStatusMessage && !submissionError ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">
                {syncStatusMessage}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={isSubmitting || adminSettings.lockdownMode}>
                {busyLabel}
              </Button>
              <span className="text-sm text-slate-300">{submissionStatusMessage}</span>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="p-6">
          <CardHeader>
            <Badge variant="outline" className="w-fit">
              AI triage
            </Badge>
            <CardTitle>Triage summary</CardTitle>
            <CardDescription>
              Analysis runs during submission and returns routing metadata for responders and operations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {activeAnalysis ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                    <p className="text-slate-400">Damage type</p>
                    <p className="font-semibold text-white">{submittedDamageType}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                    <p className="text-slate-400">Severity</p>
                    <p className="font-semibold text-white">{activeAnalysis.severity}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                    <p className="text-slate-400">Confidence</p>
                    <p className="font-semibold text-white">{formatConfidence(activeAnalysis.confidence)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                    <p className="text-slate-400">Department</p>
                    <p className="font-semibold text-white">{activeAnalysis.suggestedDepartment}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <p className="text-slate-400">Summary</p>
                  <p className="mt-1 text-slate-100">{activeAnalysis.summary}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <p className="text-slate-400">Rationale</p>
                  <p className="mt-1 text-slate-100">{activeAnalysis.rationale}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <p className="text-slate-400">Hazards</p>
                  <ul className="mt-2 space-y-1 text-slate-100">
                    {activeAnalysis.hazards.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <p className="text-slate-400">Suggested actions</p>
                  <ul className="mt-2 space-y-1 text-slate-100">
                    {activeAnalysis.suggestedActions.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-slate-400">Provider</p>
                    <p className="mt-1 text-slate-100">{activeAnalysis.provider}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-slate-400">Confidence tier</p>
                    <p className="mt-1 text-slate-100">{confidenceTier ?? "—"}</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <p className="text-slate-400">Damage type enum</p>
                  <p className="mt-1 text-slate-100">{DAMAGE_TYPES.join(" | ")}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <p className="text-slate-400">Severity enum</p>
                  <p className="mt-1 text-slate-100">{SEVERITY_ORDER.join(" | ")}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <p className="text-slate-400">Department enum</p>
                  <p className="mt-1 text-slate-100">{DEPARTMENT_ORDER.join(" | ")}</p>
                </div>
                <p className="rounded-2xl border border-dashed border-white/10 bg-transparent p-4 text-slate-300">
                  Submit the report to run AI triage and populate routing, hazards, and confidence output.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardHeader>
            <Badge variant={latestResult?.queued ? "warning" : "success"} className="w-fit">
              Submission state
            </Badge>
            <CardTitle>Latest submission</CardTitle>
            <CardDescription>Submission results include a report reference and live queue/sync status.</CardDescription>
          </CardHeader>
          <CardContent>
            {latestResult ? (
              <div
                className={`rounded-2xl border p-4 ${
                  latestResult.queued
                    ? "border-warning-400/35 bg-warning-500/12"
                    : "border-success-400/35 bg-success-500/12"
                }`}
              >
                <p className={`text-sm ${latestResult.queued ? "text-warning-100" : "text-success-100"}`}>
                  {latestResult.queued ? "Report queued successfully." : "Report submitted successfully."}
                </p>
                <p className="mt-2 text-lg font-semibold text-white">ID: {latestResult.id}</p>
                <p className="mt-1 text-sm text-slate-200">
                  {latestResult.queued ? "Queued for sync when online" : "Synced with responder pipeline"}
                </p>
              </div>
            ) : (
              <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
                Submit a report to view success details here.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
