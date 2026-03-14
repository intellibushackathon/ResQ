import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/Card";

type AuthMode = "preview" | "supabase";
type AuthView = "signin" | "signup";
type Role = "public" | "staff" | "admin";

type AuthAdapter = {
  initializeAuth: () => Promise<void>;
  signIn: (input: { email: string; password: string }) => Promise<{ role: Role }>;
  signUp: (input: { fullName?: string; email: string; password: string }) => Promise<{ role: Role }>;
  signInAsGuest: () => Promise<{ role: Role }>;
  signOut: () => Promise<void>;
  clearAuthError: () => void;
};

const previewUsers: Record<string, { password: string; role: Role }> = {
  "responder.preview@resq.local": { password: "preview123", role: "staff" },
  "admin.preview@resq.local": { password: "preview123", role: "admin" },
};

const authAdapter: AuthAdapter = {
  async initializeAuth() {
    return Promise.resolve();
  },
  async signIn({ email, password }) {
    const user = previewUsers[email.toLowerCase()];
    if (user && user.password === password) {
      return { role: user.role };
    }
    return { role: "public" };
  },
  async signUp() {
    return { role: "public" };
  },
  async signInAsGuest() {
    return { role: "public" };
  },
  async signOut() {
    return Promise.resolve();
  },
  clearAuthError() {},
};

export function Login() {
  const [mode, setMode] = useState<AuthMode>("preview");
  const [view, setView] = useState<AuthView>("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [signedInRole, setSignedInRole] = useState<Role | null>(null);

  useEffect(() => {
    void authAdapter.initializeAuth().then(() => setAuthReady(true));
  }, []);

  const defaultRoute = useMemo(() => {
    if (!signedInRole) return null;
    if (signedInRole === "admin") return "/admin";
    if (signedInRole === "staff") return "/dashboard";
    return "/";
  }, [signedInRole]);

  if (defaultRoute) {
    return <Navigate to={defaultRoute} replace />;
  }

  const clearError = () => {
    setError(null);
    authAdapter.clearAuthError();
  };

  const validate = () => {
    if (!email.trim() || !password.trim()) {
      setError("Enter an email and password to continue.");
      return false;
    }
    return true;
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearError();

    if (!validate()) {
      return;
    }

    try {
      const result =
        view === "signin"
          ? await authAdapter.signIn({ email: email.trim(), password })
          : await authAdapter.signUp({
              fullName: fullName.trim() || undefined,
              email: email.trim(),
              password,
            });
      setSignedInRole(result.role);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Authentication failed";
      setError(message);
    }
  };

  const onGuestSignIn = async () => {
    clearError();
    const result = await authAdapter.signInAsGuest();
    setSignedInRole(result.role);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
      <Card className="p-6 sm:p-7">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <Badge>Access entry</Badge>
            <Badge variant={mode === "preview" ? "warning" : "default"}>
              {mode === "preview" ? "Preview mode" : "Supabase mode"}
            </Badge>
          </div>
          <CardTitle className="text-3xl sm:text-[2rem]">Login or create your account</CardTitle>
          <CardDescription className="max-w-3xl text-base leading-7">
            Citizen auth surface with preview and Supabase-ready form variants.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="mb-5 flex flex-wrap gap-2">
            <Button variant={mode === "preview" ? "default" : "outline"} size="sm" onClick={() => setMode("preview")}>
              Preview mode
            </Button>
            <Button variant={mode === "supabase" ? "default" : "outline"} size="sm" onClick={() => setMode("supabase")}>
              Supabase mode
            </Button>
            <Button variant={view === "signin" ? "default" : "outline"} size="sm" onClick={() => setView("signin")}>
              Sign in
            </Button>
            <Button variant={view === "signup" ? "default" : "outline"} size="sm" onClick={() => setView("signup")}>
              Sign up
            </Button>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            {view === "signup" ? (
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-200">Full name</span>
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="w-full rounded-2xl border border-white/15 bg-panel-900/70 px-3 py-2 text-sm text-slate-100"
                  placeholder="Optional in preview mode"
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

            {error ? (
              <div role="alert" className="rounded-2xl border border-danger-400/35 bg-danger-500/12 px-4 py-3 text-sm text-danger-100">
                {error}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={!authReady}>
                {view === "signin" ? "Sign in" : "Create account"}
              </Button>
              <Button type="button" variant="outline" onClick={onGuestSignIn} disabled={!authReady}>
                Continue as guest
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="p-6">
        <CardHeader>
          <Badge variant="outline" className="w-fit">
            Preview credentials
          </Badge>
          <CardTitle>Role simulation</CardTitle>
          <CardDescription>Use these users in preview mode to test role-based redirection paths.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="font-semibold text-white">responder.preview@resq.local / preview123</p>
            <p className="mt-1 text-slate-300">Signs in as staff and routes to `/dashboard`.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="font-semibold text-white">admin.preview@resq.local / preview123</p>
            <p className="mt-1 text-slate-300">Signs in as admin and routes to `/admin`.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-slate-300">
            Guest sign-in creates an anonymous public session and routes to `/`.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
