import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LocationPickerMap } from "../components/maps/LocationPickerMap";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { formatConfidence, getConfidenceTier } from "../lib/confidence";
import { reverseGeocode } from "../lib/geocoding";
import { getCurrentLocation, KINGSTON_FALLBACK } from "../lib/geolocation";
import {
  DAMAGE_TYPES,
  type DamageTypeOption,
  type ReportAIAnalysis,
  type ReportSubmissionResult,
} from "../lib/reporting";
import { useAuthStore } from "../store/useAuthStore";
import { useReportStore } from "../store/useReportStore";
import { cn } from "../lib/utils";

/* ─── Pipeline step config ─── */
const PIPELINE_STEPS = [
  {
    key: "upload",
    label: "Evidence",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
      </svg>
    ),
  },
  {
    key: "analysis",
    label: "AI Analysis",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
      </svg>
    ),
  },
  {
    key: "dispatch",
    label: "Submitted",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.652a3.75 3.75 0 0 1 0-5.304m5.304 0a3.75 3.75 0 0 1 0 5.304m-7.425 2.121a6.75 6.75 0 0 1 0-9.546m9.546 0a6.75 6.75 0 0 1 0 9.546M5.106 18.894c-3.808-3.807-3.808-9.98 0-13.788m13.788 0c3.808 3.807 3.808 9.98 0 13.788M12 12h.008v.008H12V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
      </svg>
    ),
  },
];

type StepState = "idle" | "active" | "complete";

function getStepStates(phase: string | null, hasResult: boolean): StepState[] {
  if (hasResult) return ["complete", "complete", "complete"];
  switch (phase) {
    case "analyzing":
      return ["complete", "active", "idle"];
    case "submitting":
      return ["complete", "complete", "active"];
    default:
      return ["idle", "idle", "idle"];
  }
}

/* ─── Stepper component ─── */
function PipelineStepper({ phase, hasResult }: { phase: string | null; hasResult: boolean }) {
  const states = getStepStates(phase, hasResult);

  return (
    <div className="flex items-center gap-0">
      {PIPELINE_STEPS.map((step, i) => {
        const state = states[i];
        const isLast = i === PIPELINE_STEPS.length - 1;

        return (
          <div key={step.key} className="flex items-center" style={{ flex: isLast ? "0 0 auto" : "1 1 0" }}>
            {/* Step node */}
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-500",
                  state === "complete"
                    ? "border-success-400 bg-success-500/20 text-success-400"
                    : state === "active"
                      ? "border-brand-400 bg-brand-500/20 text-brand-400"
                      : "border-white/10 bg-white/[0.04] text-slate-500",
                )}
              >
                {state === "complete" ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                ) : (
                  step.icon
                )}
                {state === "active" && (
                  <span className="absolute inset-0 animate-ping rounded-full border-2 border-brand-400/40" />
                )}
              </div>
              <span
                className={cn(
                  "hidden text-xs font-semibold sm:inline",
                  state === "complete"
                    ? "text-success-400"
                    : state === "active"
                      ? "text-brand-300"
                      : "text-slate-500",
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div className="mx-3 h-px flex-1">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    states[i + 1] === "complete" || states[i + 1] === "active"
                      ? "bg-brand-400/50"
                      : "bg-white/8",
                  )}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── AI Analysis panel (dormant / active / result) ─── */
function AIAnalysisPanel({
  analysis,
  isAnalyzing,
}: {
  analysis: ReportAIAnalysis | null;
  isAnalyzing: boolean;
}) {
  // Active analyzing state
  if (isAnalyzing) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3 rounded-2xl border border-brand-400/25 bg-brand-500/[0.06] p-4"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500/15">
            <svg className="h-3.5 w-3.5 animate-spin text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-white">AI Triage Running</p>
          <Badge variant="outline" className="ml-auto text-[10px]">Live</Badge>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-brand-500/80 to-brand-400"
            initial={{ width: "15%" }}
            animate={{ width: "75%" }}
            transition={{ duration: 8, ease: "easeOut" }}
          />
        </div>
        <p className="text-[11px] text-slate-400">Analyzing photo for severity, damage type, and routing...</p>
      </motion.div>
    );
  }

  // Has result
  if (analysis) {
    const confidenceTier = getConfidenceTier(analysis.confidence);
    const tierColor =
      confidenceTier === "high"
        ? "bg-success-500"
        : confidenceTier === "medium"
          ? "bg-warning-500"
          : "bg-danger-500";
    const tierBorder =
      confidenceTier === "high"
        ? "border-success-400/20"
        : confidenceTier === "medium"
          ? "border-warning-400/20"
          : "border-danger-400/20";

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("space-y-3 rounded-2xl border p-4", tierBorder, "bg-white/[0.03]")}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500/15">
            <svg className="h-3.5 w-3.5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-white">AI Triage Complete</p>
          <Badge variant="outline" className="ml-auto text-[10px]">{analysis.provider}</Badge>
        </div>

        {/* Confidence */}
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-slate-400">Confidence</span>
            <span className="font-semibold text-white">{formatConfidence(analysis.confidence)}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
            <motion.div
              className={cn("h-full rounded-full", tierColor)}
              initial={{ width: 0 }}
              animate={{ width: `${Math.round((analysis.confidence > 1 ? analysis.confidence : analysis.confidence * 100))}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-xl border border-white/8 bg-white/[0.03] px-2 py-1.5 text-center">
            <p className="text-[10px] text-slate-500">Severity</p>
            <p className="font-semibold text-white">{analysis.severity}</p>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.03] px-2 py-1.5 text-center">
            <p className="text-[10px] text-slate-500">Type</p>
            <p className="font-semibold text-white">{analysis.damageType}</p>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.03] px-2 py-1.5 text-center">
            <p className="text-[10px] text-slate-500">Dept</p>
            <p className="font-semibold text-white">{analysis.suggestedDepartment}</p>
          </div>
        </div>

        {/* Summary */}
        <p className="text-xs leading-relaxed text-slate-300">{analysis.summary}</p>

        {/* Hazards */}
        {analysis.hazards.length > 0 && (
          <div className="text-xs">
            <p className="mb-1 font-medium text-slate-400">Hazards</p>
            <ul className="space-y-0.5 text-slate-300">
              {analysis.hazards.map((h) => (
                <li key={h} className="flex items-start gap-1.5">
                  <span className="mt-1.5 block h-1 w-1 shrink-0 rounded-full bg-danger-400" />
                  {h}
                </li>
              ))}
            </ul>
          </div>
        )}
      </motion.div>
    );
  }

  // Dormant state — always visible
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.04]">
          <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-400">AI Triage</p>
          <p className="text-[11px] text-slate-500">Activates on submission</p>
        </div>
        <Badge variant="outline" className="ml-auto border-white/[0.06] text-[10px] text-slate-500">
          Standby
        </Badge>
      </div>
      {/* Decorative faux metrics */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="h-6 rounded-lg bg-white/[0.02]" />
        <div className="h-6 rounded-lg bg-white/[0.02]" />
        <div className="h-6 rounded-lg bg-white/[0.02]" />
      </div>
    </div>
  );
}

/* ─── Main SubmitReport page ─── */
export function SubmitReport() {
  const session = useAuthStore((state) => state.session);
  const addReport = useReportStore((state) => state.addReport);
  const adminSettings = useReportStore((state) => state.adminSettings);
  const isSubmitting = useReportStore((state) => state.isSubmitting);
  const submissionPhase = useReportStore((state) => state.submissionPhase);
  const submissionError = useReportStore((state) => state.submissionError);

  const [isOnline, setIsOnline] = useState<boolean>(() => navigator.onLine);
  const [isLocating, setIsLocating] = useState(false);
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
  const [recenterKey, setRecenterKey] = useState(0);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [damageType, setDamageType] = useState<DamageTypeOption>("Flooding");
  const [description, setDescription] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locationName, setLocationName] = useState("");
  const [urgentAssist, setUrgentAssist] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [latestResult, setLatestResult] = useState<ReportSubmissionResult | null>(null);
  const navigate = useNavigate();
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, []);

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  const hasLocation = lat !== null && lng !== null;

  function updateLocation(nextLat: number, nextLng: number, recenter: boolean) {
    setLat(nextLat);
    setLng(nextLng);
    setLatestResult(null);
    setLocationName("");
    setLocalError(null);
    if (recenter) setRecenterKey((k) => k + 1);
  }

  const [locationApproximate, setLocationApproximate] = useState(false);

  const handleLocate = async () => {
    setLocalError(null);
    setLocationApproximate(false);
    setIsLocating(true);
    const resolved = await getCurrentLocation();
    setIsLocating(false);
    if (resolved.isFallback) {
      setLocalError(resolved.error ?? "Could not access your location.");
      return;
    }
    updateLocation(resolved.lat, resolved.lng, true);
    // Flag approximate if accuracy > 200m so user knows to refine via map tap
    if (resolved.accuracy && resolved.accuracy > 200) {
      setLocationApproximate(true);
    }
  };

  const handleSelectLocation = (nextLocation: { lat: number; lng: number }) => {
    setLocationApproximate(false);
    updateLocation(nextLocation.lat, nextLocation.lng, false);
  };

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
    if (lat === null || lng === null) {
      setLocalError("Please select a location on the map or use the Locate button.");
      return false;
    }
    return true;
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);

    if (!validate() || !photoFile || lat === null || lng === null) return;

    try {
      // Resolve location name once at submission time
      setIsResolvingLocation(true);
      const resolved = await reverseGeocode(lat, lng);
      const resolvedName = resolved.label;
      setLocationName(resolvedName);
      setIsResolvingLocation(false);

      const result = await addReport(
        { photoFile, damageType, description: description.trim(), lat, lng, locationName: resolvedName, urgentAssist },
        session,
      );
      setLatestResult(result);
      setPhotoFile(null);
      setPhotoPreview(null);
      setDescription("");
      setDamageType("Flooding");
      setUrgentAssist(false);
      setLat(null);
      setLng(null);
      setLocationName("");
      setFileInputKey((v) => v + 1);

      // Redirect to My Reports after a short delay so the user sees the success message
      redirectTimer.current = setTimeout(() => {
        navigate("/my-reports");
      }, 2000);
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

  const activeAnalysis: ReportAIAnalysis | null = latestResult?.report.ai ?? null;
  const isAnalyzing = submissionPhase === "analyzing";

  return (
    <div className="space-y-5">
      {/* Pipeline stepper */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-3.5">
        <PipelineStepper phase={submissionPhase} hasResult={!!latestResult} />
      </div>

      {/* Main form */}
      <form className="grid gap-5 lg:grid-cols-[1.2fr_1fr]" onSubmit={onSubmit}>
        {/* Left column — Evidence and Location */}
        <Card className="p-5">
          <p className="section-label mb-1">Evidence and location</p>
          <h2 className="mb-4 font-display text-xl tracking-tight text-white">
            Capture supporting imagery
          </h2>

          {/* Photo upload zone */}
          <label className="group flex h-52 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/10 bg-white/[0.02] transition-all duration-300 hover:border-brand-400/30 hover:bg-white/[0.04]">
            {photoPreview ? (
              <img
                src={photoPreview}
                alt="Preview"
                className="h-full w-full rounded-xl object-cover"
              />
            ) : (
              <>
                <div className="mb-2.5 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-400 transition-colors group-hover:border-brand-400/20 group-hover:text-brand-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-white">Tap to upload photo</p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  JPG, PNG, WEBP, HEIC
                </p>
              </>
            )}

            <input
              key={fileInputKey}
              type="file"
              accept="image/*"
              onChange={(e) => void onPhotoChange(e)}
              className="sr-only"
            />
          </label>

          {/* Location map picker */}
          <div className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="section-label">GPS and map pin</p>
              <Button type="button" variant="outline" size="sm" onClick={() => void handleLocate()} disabled={isSubmitting || isLocating}>
                {isLocating ? "Locating..." : "Locate"}
              </Button>
            </div>
            <LocationPickerMap
              mapCenter={hasLocation ? { lat, lng } : KINGSTON_FALLBACK}
              incidentLocation={hasLocation ? { lat, lng } : null}
              onSelectLocation={(nextLocation) => handleSelectLocation(nextLocation)}
              recenterKey={recenterKey}
            />
            {hasLocation ? (
              <>
                <p className="mt-3 text-sm text-slate-300">
                  {isResolvingLocation ? "Resolving location..." : (locationName || "Location selected")}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {lat.toFixed(6)}, {lng.toFixed(6)}
                </p>
                {locationApproximate && (
                  <p className="mt-1 text-[11px] text-warning-400">
                    Approximate — tap the map to refine the pin
                  </p>
                )}
              </>
            ) : (
              <p className="mt-3 text-sm text-slate-400">
                Tap the map to pin a location, or use the Locate button
              </p>
            )}
          </div>
        </Card>

        {/* Right column — Incident Details */}
        <Card className="flex flex-col p-5">
          <p className="section-label mb-1">Incident details</p>
          <h2 className="mb-4 font-display text-xl tracking-tight text-white">
            Describe the situation
          </h2>

          <div className="flex flex-1 flex-col gap-3.5">
            {/* Category */}
            <div>
              <p className="section-label mb-1.5">Incident category</p>
              <select
                value={damageType}
                onChange={(e) => {
                  setDamageType(e.target.value as DamageTypeOption);
                  setLatestResult(null);
                }}
                className="w-full rounded-xl border border-white/10 bg-panel-900/60 px-3.5 py-2.5 text-sm text-slate-100 transition-colors focus:border-brand-400/40 focus:outline-none"
              >
                <option value="" disabled>Select category</option>
                {DAMAGE_TYPES.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <p className="section-label mb-1.5">Short description</p>
              <textarea
                required
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setLatestResult(null);
                }}
                placeholder="Briefly describe hazards, obstructions, or injuries at the scene..."
                className="min-h-[5.5rem] w-full rounded-xl border border-white/10 bg-panel-900/60 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 transition-colors focus:border-brand-400/40 focus:outline-none"
              />
            </div>

            {/* Urgent toggle */}
            <div className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-warning-400/20 bg-warning-500/10 text-warning-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Urgent assistance</p>
                  <p className="text-[11px] text-slate-500">Immediate responder escalation</p>
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
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors",
                  urgentAssist ? "bg-brand-500" : "bg-white/15",
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
                    urgentAssist ? "translate-x-5" : "translate-x-1",
                  )}
                />
              </button>
            </div>

            {/* Error */}
            <AnimatePresence>
              {(localError || submissionError) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-2xl border border-danger-400/30 bg-danger-500/10 px-4 py-3 text-sm text-danger-100">
                    {localError || submissionError}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <Button type="submit" className="w-full" disabled={isSubmitting || adminSettings.lockdownMode}>
              {busyLabel}
            </Button>

            {/* Success */}
            <AnimatePresence>
              {latestResult && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className={cn(
                    "rounded-2xl border p-4",
                    latestResult.queued
                      ? "border-warning-400/25 bg-warning-500/8"
                      : "border-success-400/25 bg-success-500/8",
                  )}
                >
                  <p className={cn("text-sm font-semibold", latestResult.queued ? "text-warning-100" : "text-success-100")}>
                    {latestResult.queued ? "Report queued — will sync when online." : "Report submitted successfully."}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">ID: {latestResult.id}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* AI Analysis panel — always visible (dormant → active → results) */}
            <AIAnalysisPanel analysis={activeAnalysis} isAnalyzing={isAnalyzing} />
          </div>
        </Card>
      </form>
    </div>
  );
}
