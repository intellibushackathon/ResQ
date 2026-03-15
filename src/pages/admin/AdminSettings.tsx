import { Link } from "react-router-dom";
import { Badge } from "../../components/ui/Badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import { KINGSTON_FALLBACK } from "../../lib/geolocation";
import { AUTO_CONFIRM_CONFIDENCE_THRESHOLD } from "../../lib/reporting";
import { isSupabaseConfigured } from "../../lib/supabase";
import { useAuthStore } from "../../store/useAuthStore";
import { useReportStore } from "../../store/useReportStore";

const aiMode = import.meta.env.VITE_AI_PROXY_URL?.trim()
  ? "Proxy -> OpenRouter"
  : import.meta.env.VITE_OPENROUTER_API_KEY?.trim()
    ? "Direct OpenRouter"
    : "Simulation fallback";

const authRedirect = import.meta.env.VITE_SUPABASE_AUTH_REDIRECT_URL?.trim() || "Origin-derived redirect";

export function AdminSettings() {
  const session = useAuthStore((state) => state.session);
  const adminSettings = useReportStore((state) => state.adminSettings);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-6">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <Badge>AI posture</Badge>
            <Badge variant="outline">{aiMode}</Badge>
          </div>
          <CardTitle>AI and moderation policy</CardTitle>
          <CardDescription>
            Organization-wide view of how incident analysis and auto-confirm routing behave.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
            <span className="text-slate-300">Auto-confirm</span>
            <span className="font-semibold text-white">
              {adminSettings.autoConfirm ? "Enabled" : "Manual only"}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
            <span className="text-slate-300">Confidence threshold</span>
            <span className="font-semibold text-white">{Math.round(AUTO_CONFIRM_CONFIDENCE_THRESHOLD * 100)}%</span>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-slate-300">
            ResQ prefers proxy mode when configured, falls back to direct OpenRouter when available, and only uses the structured simulation path when external AI is unavailable.
          </div>
        </CardContent>
      </Card>

      <Card className="p-6">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline">Mapping and privacy</Badge>
            <Badge variant={adminSettings.privacyMode ? "warning" : "success"}>
              {adminSettings.privacyMode ? "Masked" : "Standard"}
            </Badge>
          </div>
          <CardTitle>Location services</CardTitle>
          <CardDescription>
            Shared map, geolocation, and reverse-geocoding posture for public and responder workflows.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
            <span className="text-slate-300">Fallback location</span>
            <span className="font-semibold text-white">
              {KINGSTON_FALLBACK.lat}, {KINGSTON_FALLBACK.lng}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
            <span className="text-slate-300">Reverse geocode cache</span>
            <span className="font-semibold text-white">Rounded 3-decimal key</span>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-slate-300">
            Privacy mode affects the operational stance while the app continues to retain the documented Kingston fallback and map-based incident handling.
          </div>
        </CardContent>
      </Card>

      <Card className="p-6">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline">Notifications and throughput</Badge>
            <Badge variant={adminSettings.smsAlerts ? "success" : "outline"}>
              {adminSettings.smsAlerts ? "SMS ready" : "SMS off"}
            </Badge>
          </div>
          <CardTitle>Delivery settings</CardTitle>
          <CardDescription>
            Broadcast, submission, and rate-control settings available to operations leadership.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
            <span className="text-slate-300">SMS alerts</span>
            <span className="font-semibold text-white">
              {adminSettings.smsAlerts ? "Enabled" : "Disabled"}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
            <span className="text-slate-300">Rate limit</span>
            <span className="font-semibold text-white">{adminSettings.rateLimit}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
            <span className="text-slate-300">Lockdown mode</span>
            <span className="font-semibold text-white">
              {adminSettings.lockdownMode ? "Active" : "Inactive"}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="p-6">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={isSupabaseConfigured ? "success" : "danger"}>
              {isSupabaseConfigured ? "Supabase live" : "Supabase missing"}
            </Badge>
            <Badge variant="outline">{session?.role ?? "public"} role</Badge>
          </div>
          <CardTitle>Platform settings cards</CardTitle>
          <CardDescription>
            Auth, backend, and redirect posture for the current operations environment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
            <span className="text-slate-300">Backend</span>
            <span className="font-semibold text-white">{isSupabaseConfigured ? "Supabase" : "Unavailable"}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
            <span className="text-slate-300">Auth redirect</span>
            <span className="font-semibold text-white">{authRedirect}</span>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-slate-300">
            Protected routes stay segmented between `/dashboard` for responders and `/admin/*` for operations leadership, all using the live Supabase session path.
          </div>
          <Link
            to="/admin/system-controls"
            className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-white/10 px-4 text-sm font-semibold text-slate-100 transition hover:border-brand-400/40 hover:bg-brand-500/10"
          >
            Open system controls
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
