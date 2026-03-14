import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/Card";
import type { AIAnalysis, DamageType, DepartmentFilter, Severity } from "./report-fixtures";

type SubmitState = "idle" | "analyzing" | "submitting" | "success";

type SubmitResult = {
  id: string;
  queued: boolean;
};

type ReportInput = {
  photoFile: File | null;
  damageType: DamageType;
  description: string;
  lat: number;
  lng: number;
  locationName: string;
  urgentAssist: boolean;
};

type ReportAdapter = {
  initializeReports: () => Promise<void>;
  addReport: (input: ReportInput) => Promise<SubmitResult>;
  syncOfflineQueue: () => Promise<void>;
};

const damageTypes: DamageType[] = [
  "Flooding",
  "Roof Collapse",
  "Debris/Tree",
  "Utility Damage",
  "Other",
  "Auto/AI",
];

const severityOrder: Severity[] = ["Critical", "High", "Medium", "Low"];

const departmentOrder: DepartmentFilter[] = ["NWA", "JPS", "ODPEM", "None"];

const kingstonFallback = {
  lat: 18.0179,
  lng: -76.8099,
};

const adapter: ReportAdapter = {
  async initializeReports() {
    return Promise.resolve();
  },
  async addReport() {
    await new Promise((resolve) => setTimeout(resolve, 550));
    return {
      id: `RQ-${Math.floor(Math.random() * 90000 + 10000)}`,
      queued: !navigator.onLine,
    };
  },
  async syncOfflineQueue() {
    return Promise.resolve();
  },
};

function buildAIAnalysis(input: { damageType: DamageType; description: string; urgentAssist: boolean }): AIAnalysis {
  const severity: Severity =
    input.urgentAssist || /collapse|trapped|rapid|severe|injury/i.test(input.description)
      ? "Critical"
      : input.damageType === "Flooding" || input.damageType === "Roof Collapse"
        ? "High"
        : "Medium";

  const department: DepartmentFilter =
    input.damageType === "Utility Damage"
      ? "JPS"
      : input.damageType === "Flooding"
        ? "ODPEM"
        : input.damageType === "Debris/Tree"
          ? "NWA"
          : "None";

  const confidence = input.damageType === "Auto/AI" ? 0.79 : 0.88;

  return {
    damageType: input.damageType === "Auto/AI" ? "Flooding" : input.damageType,
    severity,
    confidence,
    summary: input.urgentAssist
      ? "Urgent response likely required based on submitted context."
      : "Preliminary visual and text triage completed for routing.",
    rationale:
      "This placeholder AI panel mirrors the blueprint schema and can be replaced by the real analysis service.",
    hazards:
      severity === "Critical"
        ? ["Immediate public safety exposure", "Possible access disruption"]
        : ["Localized hazard", "Monitor changing site conditions"],
    suggestedActions:
      severity === "Critical"
        ? ["Dispatch nearest crew", "Issue public caution notice", "Preserve safe perimeter"]
        : ["Assign verification", "Schedule follow-up inspection"],
    suggestedDepartment: department,
  };
}

function formatCoordinate(value: number) {
  return value.toFixed(6);
}

export function SubmitReport() {
  const [initialized, setInitialized] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(() => navigator.onLine);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [damageType, setDamageType] = useState<DamageType>("Flooding");
  const [description, setDescription] = useState("");
  const [lat, setLat] = useState<number>(kingstonFallback.lat);
  const [lng, setLng] = useState<number>(kingstonFallback.lng);
  const [locationName, setLocationName] = useState("Pinned Incident Location");
  const [urgentAssist, setUrgentAssist] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [result, setResult] = useState<SubmitResult | null>(null);

  const ai = useMemo(
    () =>
      buildAIAnalysis({
        damageType,
        description,
        urgentAssist,
      }),
    [damageType, description, urgentAssist],
  );

  useEffect(() => {
    void adapter.initializeReports().then(() => setInitialized(true));
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

  const isBusy = submitState === "analyzing" || submitState === "submitting";

  const offlineStatusMessage = isOnline
    ? "Connected. Reports submit instantly when validation passes."
    : "Queued for sync when online";

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
      setErrorMessage(null);
    } catch {
      setPhotoFile(null);
      setErrorMessage("The selected file could not be read as an image.");
    }
  };

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setLat(kingstonFallback.lat);
      setLng(kingstonFallback.lng);
      setLocationName("Pinned Incident Location");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude);
        setLng(position.coords.longitude);
        setLocationName("Pinned Incident Location");
      },
      () => {
        setLat(kingstonFallback.lat);
        setLng(kingstonFallback.lng);
        setLocationName("Pinned Incident Location");
      },
      {
        enableHighAccuracy: true,
        timeout: 7000,
      },
    );
  };

  const handleMapPick = (nextLat: number, nextLng: number) => {
    setLat(nextLat);
    setLng(nextLng);
    setLocationName("Pinned Incident Location");
  };

  const validate = () => {
    if (!photoFile) {
      setErrorMessage("The selected file could not be read as an image.");
      return false;
    }

    if (!description.trim()) {
      setErrorMessage("Description is required.");
      return false;
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setErrorMessage("Failed to submit");
      return false;
    }

    return true;
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!validate()) {
      return;
    }

    try {
      setSubmitState("analyzing");
      await new Promise((resolve) => setTimeout(resolve, 450));

      setSubmitState("submitting");
      const saved = await adapter.addReport({
        photoFile,
        damageType,
        description: description.trim(),
        lat,
        lng,
        locationName,
        urgentAssist,
      });

      if (!isOnline) {
        setErrorMessage("Offline — report queued");
      }

      if (isOnline) {
        await adapter.syncOfflineQueue();
      }

      setResult(saved);
      setSubmitState("success");
    } catch {
      setSubmitState("idle");
      setErrorMessage("Failed to submit");
    }
  };

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
          </div>
          <CardTitle className="text-3xl sm:text-[2rem]">Submit an incident report</CardTitle>
          <CardDescription className="max-w-3xl text-base leading-7">
            Share a photo, location, and description so response teams can triage quickly.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form className="space-y-5" onSubmit={onSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                <span className="section-label mb-2 block">Photo upload</span>
                <input
                  required
                  type="file"
                  accept="image/*"
                  onChange={onPhotoChange}
                  className="w-full rounded-xl border border-white/15 bg-panel-900/50 px-3 py-2 text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-brand-500 file:px-3 file:py-2 file:text-xs file:font-semibold file:uppercase file:tracking-[0.2em] file:text-white"
                />
                <p className="mt-2 text-xs text-slate-400">A clear scene image is required.</p>
              </label>

              <label className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                <span className="section-label mb-2 block">Damage type</span>
                <select
                  value={damageType}
                  onChange={(event) => setDamageType(event.target.value as DamageType)}
                  className="w-full rounded-xl border border-white/15 bg-panel-900/60 px-3 py-2 text-sm text-slate-100"
                >
                  {damageTypes.map((option) => (
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
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe what happened, who is affected, and any immediate hazards."
                className="min-h-28 w-full rounded-xl border border-white/15 bg-panel-900/60 px-3 py-3 text-sm text-slate-100 placeholder:text-slate-500"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-[1fr_auto]">
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="section-label">GPS and map pin</p>
                  <Button variant="outline" size="sm" onClick={handleLocate} disabled={isBusy}>
                    Locate
                  </Button>
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => handleMapPick(lat + 0.000321, lng - 0.000214)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      handleMapPick(lat + 0.000321, lng - 0.000214);
                    }
                  }}
                  className="relative h-40 rounded-2xl border border-brand-400/30 bg-[radial-gradient(circle_at_30%_20%,rgba(36,145,255,0.32),transparent_50%),linear-gradient(140deg,rgba(9,24,43,0.82),rgba(6,17,31,0.92))] p-3"
                >
                  <div className="absolute inset-x-4 top-4 text-xs font-semibold uppercase tracking-[0.24em] text-brand-100">
                    Tap to set pin
                  </div>
                  <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-danger-500 shadow-[0_0_18px_rgba(255,91,115,0.75)]" />
                </div>
                <p className="mt-3 text-sm text-slate-300">{locationName}</p>
                <p className="mt-1 text-xs text-slate-400">
                  Lat {formatCoordinate(lat)} | Lng {formatCoordinate(lng)}
                </p>
              </div>

              <label className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.04] px-4 py-3 md:self-start">
                <input
                  type="checkbox"
                  checked={urgentAssist}
                  onChange={(event) => setUrgentAssist(event.target.checked)}
                  className="h-4 w-4 rounded border-white/30 bg-panel-900"
                />
                <span className="text-sm font-semibold text-white">Request urgent assist</span>
              </label>
            </div>

            {errorMessage ? (
              <div className="rounded-2xl border border-danger-400/40 bg-danger-500/15 px-4 py-3 text-sm text-danger-100">
                {errorMessage}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={isBusy || !initialized}>
                {submitState === "analyzing"
                  ? "Analyzing"
                  : submitState === "submitting"
                    ? "Submitting"
                    : "Submit report"}
              </Button>
              <span className="text-sm text-slate-300">{offlineStatusMessage}</span>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="p-6">
          <CardHeader>
            <Badge variant="outline" className="w-fit">
              AI analysis preview
            </Badge>
            <CardTitle>Triage summary</CardTitle>
            <CardDescription>Designed to mirror the production AI schema and routing metadata.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                <p className="text-slate-400">Damage type</p>
                <p className="font-semibold text-white">{ai.damageType}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                <p className="text-slate-400">Severity</p>
                <p className="font-semibold text-white">{ai.severity}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                <p className="text-slate-400">Confidence</p>
                <p className="font-semibold text-white">{Math.round(ai.confidence * 100)}%</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                <p className="text-slate-400">Department</p>
                <p className="font-semibold text-white">{ai.suggestedDepartment}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <p className="text-slate-400">Summary</p>
              <p className="mt-1 text-slate-100">{ai.summary}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <p className="text-slate-400">Rationale</p>
              <p className="mt-1 text-slate-100">{ai.rationale}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <p className="text-slate-400">Hazards</p>
              <ul className="mt-2 space-y-1 text-slate-100">
                {ai.hazards.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <p className="text-slate-400">Suggested actions</p>
              <ul className="mt-2 space-y-1 text-slate-100">
                {ai.suggestedActions.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <p className="text-slate-400">Severity enum</p>
              <p className="mt-1 text-slate-100">{severityOrder.join(" | ")}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <p className="text-slate-400">Department enum</p>
              <p className="mt-1 text-slate-100">{departmentOrder.join(" | ")}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardHeader>
            <Badge variant="success" className="w-fit">
              Submission state
            </Badge>
            <CardTitle>Latest submission</CardTitle>
            <CardDescription>Success state includes report ID and queue/sync context.</CardDescription>
          </CardHeader>
          <CardContent>
            {submitState === "success" && result ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-success-400/35 bg-success-500/12 p-4"
              >
                <p className="text-sm text-success-100">Report submitted successfully.</p>
                <p className="mt-2 text-lg font-semibold text-white">ID: {result.id}</p>
                <p className="mt-1 text-sm text-slate-200">
                  {result.queued ? "Queued for sync when online" : "Synced with responder pipeline"}
                </p>
              </motion.div>
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
