import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
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
  const enterGuestMode = useAuthStore((state) => state.enterGuestMode);
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
    if (!session || session.isAnonymous) return null;
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

  function handleGuest() {
    resetErrors();
    enterGuestMode();
    navigate("/", { replace: true });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetErrors();
    if (!validate()) return;

    try {
      const nextSession =
        view === "signup"
          ? await signUp({ fullName: fullName.trim() || undefined, email: email.trim(), password })
          : await signIn({ email: email.trim(), password });
      navigate(getDefaultRouteForSession(nextSession), { replace: true });
    } catch (error) {
      if (error instanceof Error) setLocalError(error.message);
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-panel-900/60 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.3)] backdrop-blur-xl sm:p-8">
        <h1 className="mb-1 text-center font-display text-2xl text-white">
          {view === "signup" ? "Create account" : "Welcome back"}
        </h1>
        <p className="mb-6 text-center text-sm text-slate-400">
          {view === "signup" ? "Sign up to get started" : "Sign in to continue"}
        </p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {view === "signup" ? (
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-300">Full name</span>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-400/50 focus:outline-none focus:ring-1 focus:ring-brand-400/30"
                placeholder="Your full name"
              />
            </label>
          ) : null}

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-300">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-400/50 focus:outline-none focus:ring-1 focus:ring-brand-400/30"
              placeholder="you@example.com"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-300">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-400/50 focus:outline-none focus:ring-1 focus:ring-brand-400/30"
              placeholder="Enter password"
            />
          </label>

          {errorMessage ? (
            <div role="alert" className="rounded-xl border border-danger-400/35 bg-danger-500/12 px-4 py-2.5 text-sm text-danger-100">
              {errorMessage}
            </div>
          ) : null}

          <Button type="submit" className="w-full" disabled={!isReady || isLoading || !isSupabaseConfigured}>
            {isLoading ? "Please wait..." : view === "signup" ? "Create account" : "Sign in"}
          </Button>
        </form>

        <div className="mt-4 flex flex-col items-center gap-3">
          <button
            type="button"
            className="text-sm text-slate-400 transition-colors hover:text-brand-300"
            onClick={() => {
              resetErrors();
              setView(view === "signin" ? "signup" : "signin");
            }}
          >
            {view === "signin" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
          <button
            type="button"
            className="text-sm text-slate-500 transition-colors hover:text-slate-300"
            onClick={handleGuest}
          >
            Continue as guest
          </button>
        </div>
      </div>
    </div>
  );
}
