import { Navigate, Outlet, Route, Routes, BrowserRouter } from "react-router-dom";

type RouteDefinition = {
  path?: string;
  title: string;
  description: string;
  category: string;
};

const publicRoutes: RouteDefinition[] = [
  {
    title: "Submit Report",
    description: "Citizen incident submission with media, GPS, offline queue, and AI triage hooks.",
    category: "Citizen reporting",
  },
  {
    path: "my-reports",
    title: "My Reports",
    description: "Citizen incident history with status-based browsing and incident detail affordances.",
    category: "Citizen reporting",
  },
  {
    path: "alerts",
    title: "Alerts",
    description: "Critical unresolved incident feed for citizens and field responders.",
    category: "Public alerts",
  },
  {
    path: "safe-zones",
    title: "Safe Zones",
    description: "Static shelter and fallback-location directory for disaster response.",
    category: "Public safety",
  },
  {
    path: "login",
    title: "Login",
    description: "Preview-mode and Supabase auth bridge for citizens, staff, and admin users.",
    category: "Access control",
  },
  {
    path: "dashboard",
    title: "Dashboard",
    description: "Protected responder control center for verification, dispatch, and resolution workflows.",
    category: "Responder operations",
  },
];

const adminRoutes: RouteDefinition[] = [
  {
    title: "Admin Dashboard",
    description: "Operations center overview with metrics, queue preview, and audit summaries.",
    category: "Operations",
  },
  {
    path: "moderation",
    title: "Admin Moderation",
    description: "Verification queue, severity overrides, and routing controls.",
    category: "Operations",
  },
  {
    path: "audit-logs",
    title: "Admin Audit Logs",
    description: "Searchable activity timeline for operations and compliance review.",
    category: "Operations",
  },
  {
    path: "system-controls",
    title: "Admin System Controls",
    description: "Feature toggles, privacy mode, lockdown controls, and operational switches.",
    category: "Operations",
  },
  {
    path: "team",
    title: "Admin Team",
    description: "Operational roster and staff-status view.",
    category: "Operations",
  },
  {
    path: "settings",
    title: "Admin Settings",
    description: "AI, messaging, geolocation, and server configuration surfaces.",
    category: "Operations",
  },
];

function AppShellPlaceholder({ label }: { label: string }) {
  return (
    <div className="min-h-screen px-6 py-12 sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-6xl flex-col rounded-[32px] border border-white/10 bg-panel-900/70 p-8 shadow-panel backdrop-blur-xl">
        <div className="mb-10 inline-flex w-fit items-center rounded-full border border-brand-400/30 bg-brand-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-brand-100">
          {label}
        </div>
        <div className="mb-6 max-w-3xl space-y-4">
          <p className="section-label">ResQ platform</p>
          <h1 className="font-display text-4xl text-white sm:text-5xl">
            Disaster response coordination, mapped by route.
          </h1>
          <p className="text-base leading-7 text-slate-300 sm:text-lg">
            The public, responder, and operations sections are wired into the application tree and ready
            for their full interfaces and services.
          </p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}

function RoutePlaceholder({ title, description, category }: RouteDefinition) {
  return (
    <section className="panel-outline grid gap-6 rounded-[28px] p-6 sm:p-8">
      <div className="space-y-3">
        <p className="section-label">ResQ section</p>
        <h2 className="font-display text-3xl text-white">{title}</h2>
        <p className="max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">{description}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <span className="status-chip bg-brand-500/15 text-brand-100">{category}</span>
      </div>
    </section>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppShellPlaceholder label="Public application tree" />}>
          {publicRoutes.map((route) => (
            <Route
              key={route.path ?? "index"}
              index={route.path === undefined}
              path={route.path}
              element={<RoutePlaceholder {...route} />}
            />
          ))}
        </Route>
        <Route path="/admin" element={<AppShellPlaceholder label="Admin application tree" />}>
          {adminRoutes.map((route) => (
            <Route
              key={route.path ?? "index"}
              index={route.path === undefined}
              path={route.path}
              element={<RoutePlaceholder {...route} />}
            />
          ))}
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
