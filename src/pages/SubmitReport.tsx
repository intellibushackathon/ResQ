import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/Card";
import { reverseGeocode } from "../lib/geocoding";
import { getCurrentLocation, KINGSTON_FALLBACK } from "../lib/geolocation";
import {
  DAMAGE_TYPES,
  type DamageTypeOption,
  type ReportSubmissionResult,
} from "../lib/reporting";
import { useAuthStore } from "../store/useAuthStore";
import { useReportStore } from "../store/useReportStore";

const PIPELINE_STEPS = [
  {
    label: "Evidence Upload",
    status: "Waiting",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
      </svg>
    ),
  },
  {
    label: "AI Analysis",
    status: "Pending",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
      </svg>
    ),
  },
  {
    label: "Dispatch Queue",
    status: "Standby",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.652a3.75 3.75 0 0 1 0-5.304m5.304 0a3.75 3.75 0 0 1 0 5.304m-7.425 2.121a6.75 6.75 0 0 1 0-9.546m9.546 0a6.75 6.75 0 0 1 0 9.546M5.106 18.894c-3.808-3.807-3.808-9.98 0-13.788m13.788 0c3.808 3.807 3.808 9.98 0 13.788M12 12h.008v.008H12V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
      </svg>
    ),
  },
];

export function SubmitReport() {
  const session = useAuthStore((state) => state.session);
  const addReport = useReportStore((state) => state.addReport);
  const adminSettings = useReportStore((state) => state.adminSettings);
  const isSubmitting = useReportStore((state) => state.isSubmitting);
  const submissionPhase = useReportStore((state) => state.submissionPhase);
  const submissionError = useReportStore((state) => state.submissionError);

  const [isOnline, setIsOnline] = useState<boolean>(() => navigator.onLine);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
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

  useEffect(() => {
    void (async () => {
      const resolved = await getCurrentLocation();
      setLat(resolved.lat);
      setLng(resolved.lng);
      const geo = await reverseGeocode(resolved.lat, resolved.lng);
      setLocationName(geo.label);
    })();
  }, []);

  const onPhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setPhotoFile(null);
      setPhotoPreview(null);
      return;
    }

    try {
      await file.arrayBuffer();
      if (!file.type.startsWith("image/")) {
        throw new Error("invalid");
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
      setLocalError(null);
      setLatestResult(null);
    } catch {
      setPhotoFile(null);
      setPhotoPreview(null);
      setLocalError("The selected file could not be read as an image.");
    }
  };

  const validate = () => {
    if (!photoFile) {
      setLocalError("A photo is required to submit a report.");
      return false;
    }
    if (!description.trim()) {
      setLocalError("Description is required.");
      return false;
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
      setLocalError("Failed to resolve location.");
      return false;
    }
    return true;
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);

    if (!validate() || !photoFile) return;

    try {
      const result = await addReport(
        { photoFile, damageType, description: description.trim(), lat, lng, locationName, urgentAssist },
        session,
      );
      setLatestResult(result);
      setPhotoFile(null);
      setPhotoPreview(null);
      setDescription("");
      setDamageType("Flooding");
      setUrgentAssist(false);
      setFileInputKey((v) => v + 1);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Failed to submit");
    }
  };

  const busyLabel =
    submissionPhase === "analyzing"
      ? "Analyzing..."
      : submissionPhase === "submitting"
        ? "Submitting..."
        : "Submit report";

  return (
    <div className="space-y-6">
      {/* Pipeline stepper */}
      <div className="grid grid-cols-3 gap-4">
        {PIPELINE_STEPS.map((step) => (
          <Card key={step.label} className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-slate-300">
              {step.icon}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{step.label}</p>
              <p className="text-xs text-slate-400">{step.status}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Main form */}
      <form className="grid gap-6 lg:grid-cols-[1.2fr_1fr]" onSubmit={onSubmit}>
        {/* Left column — Evidence and Location */}
        <Card className="p-6">
          <p className="section-label mb-1">Evidence and location</p>
          <h2 className="mb-6 font-display text-2xl tracking-tight text-white">
            Capture supporting imagery
          </h2>

          {/* Photo upload zone */}
          <label className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] px-6 py-12 transition-colors hover:border-brand-400/30 hover:bg-white/[0.04]">
            {photoPreview ? (
              <img
                src={photoPreview}
                alt="Preview"
                className="mb-4 max-h-48 rounded-xl object-contain"
              />
            ) : (
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/15 text-slate-400">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                </svg>
              </div>
            )}

            <p className="text-lg font-semibold text-white">
              {photoFile ? photoFile.name : "Tap to upload photo"}
            </p>
            <p className="mt-2 max-w-xs text-center text-sm text-slate-400">
              High-resolution imagery improves automated severity detection and routing confidence.
            </p>
            <div className="mt-4 flex gap-2">
              {["JPG", "PNG", "WEBP", "HEIC"].map((fmt) => (
                <span
                  key={fmt}
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium tracking-wider text-slate-400"
                >
                  {fmt}
                </span>
              ))}
            </div>

            <input
              key={fileInputKey}
              type="file"
              accept="image/*"
              onChange={(e) => void onPhotoChange(e)}
              className="sr-only"
            />
          </label>

          {/* Location readout */}
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500">Location</p>
                <p className="mt-1 text-sm text-slate-200">{locationName}</p>
                <p className="text-xs text-slate-500">
                  {lat.toFixed(5)}, {lng.toFixed(5)}
                </p>
              </div>
              <Badge variant="outline" className="shrink-0">Auto-detected</Badge>
            </div>
          </div>
        </Card>

        {/* Right column — Incident Details */}
        <Card className="flex flex-col p-6">
          <p className="section-label mb-1">Incident details</p>
          <h2 className="mb-6 font-display text-2xl tracking-tight text-white">
            Describe the situation
          </h2>

          <div className="flex flex-1 flex-col gap-5">
            {/* Category */}
            <div>
              <p className="section-label mb-2">Incident category</p>
              <select
                value={damageType}
                onChange={(e) => {
                  setDamageType(e.target.value as DamageTypeOption);
                  setLatestResult(null);
                }}
                className="w-full rounded-xl border border-white/15 bg-panel-900/60 px-4 py-3 text-sm text-slate-100"
              >
                <option value="" disabled>Select category</option>
                {DAMAGE_TYPES.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="flex-1">
              <p className="section-label mb-2">Short description</p>
              <textarea
                required
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setLatestResult(null);
                }}
                placeholder="Briefly describe hazards, obstructions, or injuries at the scene..."
                className="min-h-32 w-full rounded-xl border border-white/15 bg-panel-900/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500"
              />
            </div>

            {/* Urgent toggle */}
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-warning-400/30 bg-warning-500/10 text-warning-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Urgent assistance needed</p>
                  <p className="text-xs text-slate-400">Requires immediate responder attention and escalation.</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={urgentAssist}
                onClick={() => {
                  setUrgentAssist(!urgentAssist);
                  setLatestResult(null);
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors ${
                  urgentAssist ? "bg-brand-500" : "bg-white/15"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    urgentAssist ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Error */}
            {(localError || submissionError) && (
              <div className="rounded-2xl border border-danger-400/40 bg-danger-500/15 px-4 py-3 text-sm text-danger-100">
                {localError || submissionError}
              </div>
            )}

            {/* Success */}
            {latestResult && (
              <div
                className={`rounded-2xl border p-4 ${
                  latestResult.queued
                    ? "border-warning-400/35 bg-warning-500/12"
                    : "border-success-400/35 bg-success-500/12"
                }`}
              >
                <p className={`text-sm font-semibold ${latestResult.queued ? "text-warning-100" : "text-success-100"}`}>
                  {latestResult.queued ? "Report queued." : "Report submitted."}
                </p>
                <p className="mt-1 text-xs text-slate-300">ID: {latestResult.id}</p>
              </div>
            )}

            {/* Submit */}
            <Button type="submit" className="w-full" disabled={isSubmitting || adminSettings.lockdownMode}>
              {busyLabel}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
