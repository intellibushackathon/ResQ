import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/Card";
import { isSupabaseConfigured } from "../lib/supabase";
import { getDefaultRouteForSession, useAuthStore } from "../store/useAuthStore";

type AuthView = "signin" | "signup";

export function Login() {
  const navigate = useNavigate();
  const session = useAuthStore((state) => state.session);
  const isReady = useAuthStore((state) => state.isReady);
  const isLoading = useAuthStore((state) => state.isLoading);
  const authError = useAuthStore((state) => state.authError);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const signIn = useAuthStore((state) => state.signIn);
  const signUp = useAuthStore((state) => state.signUp);
  const clearAuthError = useAuthStore((state) => state.clearAuthError);

  const [view, setView] = useState<AuthView>("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    void initializeAuth();
  }, [initializeAuth]);

  const errorMessage = localError ?? authError;

  const defaultRoute = useMemo(() => {
    if (!session) return null;
    return getDefaultRouteForSession(session);
  }, [session]);

  if (defaultRoute) {
    return <Navigate to={defaultRoute} replace />;
  }

  function resetErrors() {
    setLocalError(null);
    clearAuthError();
  }

  function validate() {
    if (!email.trim() || !password.trim()) {
      setLocalError("Enter an email and password to continue.");
      return false;
    }

    return true;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetErrors();

    if (!validate()) {
      return;
    }

    try {
      const nextSession =
        view === "signup"
          ? await signUp({
              fullName: fullName.trim() || undefined,
              email: email.trim(),
              password,
            })
          : await signIn({
              email: email.trim(),
              password,
            });

      navigate(getDefaultRouteForSession(nextSession), { replace: true });
    } catch (error) {
      if (error instanceof Error) {
        setLocalError(error.message);
      }
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
      <Card className="p-6 sm:p-7">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <Badge>Access entry</Badge>
            <Badge variant={isSupabaseConfigured ? "default" : "danger"}>
              {isSupabaseConfigured ? "Supabase mode" : "Configuration required"}
            </Badge>
          </div>
          <CardTitle className="text-3xl sm:text-[2rem]">Login or create your account</CardTitle>
          <CardDescription className="max-w-3xl text-base leading-7">
            Citizens, responders, and operators share one access surface, with role-based routing after sign-in.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="mb-5 flex flex-wrap gap-2">
            <Button variant={view === "signin" ? "default" : "outline"} size="sm" onClick={() => setView("signin")}>
              Sign in
            </Button>
            <Button variant={view === "signup" ? "default" : "outline"} size="sm" onClick={() => setView("signup")}>
              Sign up
            </Button>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {view === "signup" ? (
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-200">Full name</span>
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="w-full rounded-2xl border border-white/15 bg-panel-900/70 px-3 py-2 text-sm text-slate-100"
                  placeholder="Your full name"
                />
              </label>
            ) : null}

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-200">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-white/15 bg-panel-900/70 px-3 py-2 text-sm text-slate-100"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-200">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-white/15 bg-panel-900/70 px-3 py-2 text-sm text-slate-100"
              />
            </label>

            {errorMessage ? (
              <div
                role="alert"
                className="rounded-2xl border border-danger-400/35 bg-danger-500/12 px-4 py-3 text-sm text-danger-100"
              >
                {errorMessage}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={!isReady || isLoading || !isSupabaseConfigured}>
                {view === "signup" ? "Create account" : "Sign in"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="p-6">
        <CardHeader>
          <Badge variant="outline" className="w-fit">
            Supabase account flow
          </Badge>
          <CardTitle>Live backend authentication</CardTitle>
          <CardDescription>
            Sign-in and sign-up now use the configured Supabase project directly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="font-semibold text-white">Sign-up fields</p>
            <p className="mt-1 text-slate-300">Full name, email, and password.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-slate-300">
            Successful sign-up creates a public profile by default. Staff and admin elevation require profile updates.
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-slate-300">
            Public routes remain available without signing in. Protected responder and admin routes require an authenticated session with the correct role.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
