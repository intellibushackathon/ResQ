import { useEffect, useState } from "react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import { clearReverseGeocodeCache } from "../../lib/geocoding";
import { clearReportImageUrlCache } from "../../lib/supabaseData";
import { useAuthStore } from "../../store/useAuthStore";
import { useReportStore } from "../../store/useReportStore";

type SettingKey = "privacyMode" | "autoConfirm" | "smsAlerts" | "lockdownMode";

const toggleCards: Array<{
  key: SettingKey;
  title: string;
  description: string;
}> = [
  {
    key: "privacyMode",
    title: "Privacy mode",
    description: "Mask sensitive location handling for operational views when enabled.",
  },
  {
    key: "autoConfirm",
    title: "Auto-confirm",
    description: "Allow high-confidence AI recommendations to move faster through moderation.",
  },
  {
    key: "smsAlerts",
    title: "SMS alerts",
    description: "Enable emergency text escalation for public and responder notifications.",
  },
  {
    key: "lockdownMode",
    title: "Lockdown mode",
    description: "Pause new public submissions while command staff stabilizes the platform.",
  },
];

export function AdminSystemControls() {
  const session = useAuthStore((state) => state.session);
  const adminSettings = useReportStore((state) => state.adminSettings);
  const adminSettingsWarning = useReportStore((state) => state.adminSettingsWarning);
  const updateAdminSetting = useReportStore((state) => state.updateAdminSetting);
  const loadAdminData = useReportStore((state) => state.loadAdminData);
  const initializeReports = useReportStore((state) => state.initializeReports);

  const [rateLimitInput, setRateLimitInput] = useState(String(adminSettings.rateLimit));
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setRateLimitInput(String(adminSettings.rateLimit));
  }, [adminSettings.rateLimit]);

  async function handleToggle(key: SettingKey) {
    setBusyKey(key);
    setMessage(null);
    setErrorMessage(null);

    try {
      await updateAdminSetting(key, !adminSettings[key]);
      setMessage(`${key} updated successfully.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : `Unable to update ${key}.`);
    } finally {
      setBusyKey(null);
    }
  }

  async function handleRateLimitSave() {
    const parsed = Number(rateLimitInput);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setErrorMessage("Rate limit must be a positive number.");
      return;
    }

    setBusyKey("rateLimit");
    setMessage(null);
    setErrorMessage(null);

    try {
      await updateAdminSetting("rateLimit", parsed);
      setMessage("Rate limit updated successfully.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update the rate limit.");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleFlushCaches() {
    setBusyKey("cache");
    setMessage(null);
    setErrorMessage(null);

    try {
      clearReverseGeocodeCache();
      clearReportImageUrlCache();
      await initializeReports(session ? { uid: session.uid, role: session.role } : null);
      await loadAdminData();
      setMessage("Operational caches cleared and live data refreshed.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to flush operational caches.");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {toggleCards.map((card) => {
          const enabled = adminSettings[card.key];

          return (
            <Card key={card.key} className="p-5">
              <CardHeader className="mb-3 gap-1">
                <Badge variant={enabled ? "success" : "outline"} className="w-fit">
                  {enabled ? "Enabled" : "Disabled"}
                </Badge>
                <CardTitle>{card.title}</CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant={enabled ? "danger" : "outline"}
                  onClick={() => void handleToggle(card.key)}
                  disabled={busyKey !== null}
                >
                  {busyKey === card.key
                    ? "Saving..."
                    : enabled
                      ? `Disable ${card.title}`
                      : `Enable ${card.title}`}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
        <Card className="p-6">
          <CardHeader>
            <Badge variant="outline" className="w-fit">
              Operational controls
            </Badge>
            <CardTitle>Rate limiting and cache actions</CardTitle>
            <CardDescription>
              Tune throughput policy and clear cached operational lookups when command staff needs a hard refresh.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="space-y-2">
              <span className="section-label">API rate limit</span>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  value={rateLimitInput}
                  onChange={(event) => setRateLimitInput(event.target.value)}
                  inputMode="numeric"
                  className="h-11 flex-1 rounded-2xl border border-white/15 bg-panel-900/60 px-4 text-sm text-slate-100"
                />
                <Button
                  onClick={() => void handleRateLimitSave()}
                  disabled={busyKey !== null}
                >
                  {busyKey === "rateLimit" ? "Saving..." : "Save rate limit"}
                </Button>
              </div>
            </label>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-sm text-slate-400">Cache flush</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Clears the client-side reverse geocode cache and signed image URL cache, then refreshes live reports and admin support data.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => void handleFlushCaches()}
                disabled={busyKey !== null}
              >
                {busyKey === "cache" ? "Refreshing..." : "Flush caches"}
              </Button>
            </div>

            {adminSettingsWarning ? (
              <div className="rounded-[22px] border border-warning-400/35 bg-warning-500/12 p-4 text-sm text-warning-100">
                {adminSettingsWarning}
              </div>
            ) : null}

            {errorMessage ? (
              <div className="rounded-[22px] border border-danger-400/35 bg-danger-500/12 p-4 text-sm text-danger-100">
                {errorMessage}
              </div>
            ) : null}

            {message ? (
              <div className="rounded-[22px] border border-success-400/35 bg-success-500/12 p-4 text-sm text-success-100">
                {message}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardHeader>
            <Badge variant="warning" className="w-fit">
              Safeguards summary
            </Badge>
            <CardTitle>Current operational posture</CardTitle>
            <CardDescription>
              Snapshot of the most important platform control states for supervisors.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <span className="text-slate-300">Privacy mode</span>
              <span className="font-semibold text-white">
                {adminSettings.privacyMode ? "Masked" : "Standard"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <span className="text-slate-300">Auto-confirm</span>
              <span className="font-semibold text-white">
                {adminSettings.autoConfirm ? "Threshold enabled" : "Manual review"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <span className="text-slate-300">SMS alerts</span>
              <span className="font-semibold text-white">
                {adminSettings.smsAlerts ? "Broadcast ready" : "Disabled"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <span className="text-slate-300">Rate limit</span>
              <span className="font-semibold text-white">{adminSettings.rateLimit}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <span className="text-slate-300">Submission posture</span>
              <span className="font-semibold text-white">
                {adminSettings.lockdownMode ? "Locked down" : "Open"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
