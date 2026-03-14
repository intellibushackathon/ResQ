import type { ReactNode } from "react";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../ui/Badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/Card";
import {
  hasRequiredRole,
  roleDisplayLabel,
  useAuthStore,
} from "../../store/useAuthStore";
import type { AppRole } from "../../lib/supabase";

type AccessGateProps = {
  minimumRole: Extract<AppRole, "staff" | "admin">;
  children: ReactNode;
};

export function AccessGate({ minimumRole, children }: AccessGateProps) {
  const session = useAuthStore((state) => state.session);
  const backend = useAuthStore((state) => state.backend);
  const isReady = useAuthStore((state) => state.isReady);
  const isLoading = useAuthStore((state) => state.isLoading);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  useEffect(() => {
    if (!isReady) {
      void initializeAuth();
    }
  }, [initializeAuth, isReady]);

  if (!isReady || isLoading) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center justify-center px-4 py-10">
        <Card className="w-full p-8">
          <CardHeader>
            <Badge variant="outline" className="w-fit">
              AccessGate
            </Badge>
            <CardTitle>Checking role access</CardTitle>
            <CardDescription>ResQ is resolving your session and role requirements.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (hasRequiredRole(session, minimumRole)) {
    return <>{children}</>;
  }

  const currentRole = session?.role ?? "public";

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-4xl items-center justify-center px-4 py-10">
      <Card className="w-full max-w-2xl p-8">
        <CardHeader>
          <div className="flex flex-wrap gap-2">
            <Badge variant="danger">Access denied</Badge>
            <Badge variant="outline">{backend === "supabase" ? "Supabase backend" : "Preview backend"}</Badge>
          </div>
          <CardTitle>Protected route</CardTitle>
          <CardDescription>
            This area requires a higher role than the one currently active in your session.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
              <p className="section-label">Current role</p>
              <p className="mt-3 text-lg font-semibold text-white">{roleDisplayLabel(currentRole)}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
              <p className="section-label">Required role</p>
              <p className="mt-3 text-lg font-semibold text-white">{roleDisplayLabel(minimumRole)}</p>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 text-sm leading-7 text-slate-300">
            Sign in with a responder or admin account to continue, or return to the public reporting routes.
          </div>

          <Link
            to="/login"
            className="inline-flex h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(36,145,255,0.92),rgba(21,118,221,0.9))] px-5 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-[0_18px_32px_rgba(36,145,255,0.28)] transition-transform duration-200 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-panel-950"
          >
            Go to login
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
