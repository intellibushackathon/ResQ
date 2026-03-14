import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/Card";
import { DAMAGE_TYPES, DEPARTMENT_ORDER, SEVERITY_ORDER, type DamageType } from "../lib/reporting";

type ReportInput = {
  photoFile: File | null;
  damageType: DamageType;
  description: string;
  lat: number;
  lng: number;
  urgentAssist: boolean;
};

const kingstonFallback = {
  lat: 18.0179,
  lng: -76.8099,
};

function formatCoordinate(value: number) {
  return value.toFixed(6);
}

export function SubmitReport() {
  const [isOnline, setIsOnline] = useState<boolean>(() => navigator.onLine);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [damageType, setDamageType] = useState<DamageType>("Flooding");
  const [description, setDescription] = useState("");
  const [lat, setLat] = useState<number>(kingstonFallback.lat);
  const [lng, setLng] = useState<number>(kingstonFallback.lng);
  const [urgentAssist, setUrgentAssist] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  const submissionStatusMessage = isOnline
    ? "Connected to the network. Live report writes are not wired in this client yet."
    : "Offline. Live report submission remains unavailable until connectivity returns.";

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
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude);
        setLng(position.coords.longitude);
      },
      () => {
        setLat(kingstonFallback.lat);
        setLng(kingstonFallback.lng);
      },
      {
        enableHighAccuracy: true,
        timeout: 7000,
      },
    );
  };

  const validate = (input: ReportInput) => {
    if (!input.photoFile) {
      setErrorMessage("The selected file could not be read as an image.");
      return false;
    }

    if (!input.description.trim()) {
      setErrorMessage("Description is required.");
      return false;
    }

    if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) {
      setErrorMessage("Failed to submit");
      return false;
    }

    return true;
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setNoticeMessage(null);

    const input: ReportInput = {
      photoFile,
      damageType,
      description: description.trim(),
      lat,
      lng,
      urgentAssist,
    };

    if (!validate(input)) {
      return;
    }

    setNoticeMessage("Live report submission has not been connected to the backend in this client yet.");
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
            Capture the incident details here. The live report write path still needs to be connected in this client.
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
                <p className="mt-2 text-xs text-slate-400">A clear scene image is required for the final submission flow.</p>
              </label>

              <label className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                <span className="section-label mb-2 block">Damage type</span>
                <select
                  value={damageType}
                  onChange={(event) => setDamageType(event.target.value as DamageType)}
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
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe what happened, who is affected, and any immediate hazards."
                className="min-h-28 w-full rounded-xl border border-white/15 bg-panel-900/60 px-3 py-3 text-sm text-slate-100 placeholder:text-slate-500"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-[1fr_auto]">
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="section-label">GPS and map pin</p>
                  <Button type="button" variant="outline" size="sm" onClick={handleLocate}>
                    Locate
                  </Button>
                </div>
                <div
                  className="relative h-40 rounded-2xl border border-brand-400/30 bg-[radial-gradient(circle_at_30%_20%,rgba(36,145,255,0.32),transparent_50%),linear-gradient(140deg,rgba(9,24,43,0.82),rgba(6,17,31,0.92))] p-3"
                >
                  <div className="absolute inset-x-4 top-4 text-xs font-semibold uppercase tracking-[0.24em] text-brand-100">
                    Map integration pending
                  </div>
                  <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-danger-500 shadow-[0_0_18px_rgba(255,91,115,0.75)]" />
                </div>
                <p className="mt-3 text-sm text-slate-300">Current location estimate</p>
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

            {noticeMessage ? (
              <div className="rounded-2xl border border-warning-400/40 bg-warning-500/15 px-4 py-3 text-sm text-warning-100">
                {noticeMessage}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit">Validate form</Button>
              <span className="text-sm text-slate-300">{submissionStatusMessage}</span>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="p-6">
          <CardHeader>
            <Badge variant="outline" className="w-fit">
              Triage schema
            </Badge>
            <CardTitle>AI and routing contract</CardTitle>
            <CardDescription>Static enums and schema notes stay here until the live analysis service is connected.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <p className="text-slate-400">Damage type enum</p>
              <p className="mt-1 text-slate-100">{DAMAGE_TYPES.join(" | ")}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <p className="text-slate-400">Live analysis status</p>
              <p className="mt-1 text-slate-100">
                This panel is waiting on the backend classification and routing response.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <p className="text-slate-400">Severity enum</p>
              <p className="mt-1 text-slate-100">{SEVERITY_ORDER.join(" | ")}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <p className="text-slate-400">Department enum</p>
              <p className="mt-1 text-slate-100">{DEPARTMENT_ORDER.join(" | ")}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardHeader>
            <Badge variant="outline" className="w-fit">
              Submission readiness
            </Badge>
            <CardTitle>Client integration status</CardTitle>
            <CardDescription>Current form readiness and backend wiring status for this page.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <span className="text-slate-300">Auth backend</span>
              <span className="font-semibold text-white">Supabase</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <span className="text-slate-300">Network</span>
              <span className="font-semibold text-white">{isOnline ? "Online" : "Offline"}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <span className="text-slate-300">Pinned coordinates</span>
              <span className="font-semibold text-white">
                {formatCoordinate(lat)}, {formatCoordinate(lng)}
              </span>
            </div>
            <div className="rounded-2xl border border-dashed border-white/10 bg-transparent p-4 text-slate-300">
              Report creation no longer uses a mock adapter. Wire the real write path here when the report tables and
              storage contract are ready.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
