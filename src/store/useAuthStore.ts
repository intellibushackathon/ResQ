import type { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";
import { supabase, type AppRole, type ProfileRecord } from "../lib/supabase";

export type AuthBackend = "supabase";

export type AuthSession = {
  uid: string;
  role: AppRole;
  displayName: string;
  email: string | null;
  isAnonymous: boolean;
  staffOrg: string | null;
};

type SignInInput = {
  email: string;
  password: string;
};

type SignUpInput = {
  fullName?: string;
  email: string;
  password: string;
};

type AuthState = {
  session: AuthSession | null;
  backend: AuthBackend;
  isReady: boolean;
  isLoading: boolean;
  authError: string | null;
  initializeAuth: () => Promise<void>;
  signIn: (input: SignInInput) => Promise<AuthSession>;
  signUp: (input: SignUpInput) => Promise<AuthSession>;
  signOut: () => Promise<void>;
  enterGuestMode: () => void;
  clearAuthError: () => void;
};

export const rolePriority: Record<AppRole, number> = {
  public: 0,
  staff: 1,
  admin: 2,
};

export function hasRequiredRole(session: AuthSession | null, minimumRole: AppRole) {
  const currentRole = session?.role ?? "public";
  return rolePriority[currentRole] >= rolePriority[minimumRole];
}

export function roleDisplayLabel(role: AppRole) {
  if (role === "admin") return "Admin";
  if (role === "staff") return "Responder";
  return "Citizen Reporter";
}

export function getDefaultRouteForSession(session: AuthSession | null) {
  if (session?.role === "admin") return "/admin";
  if (session?.role === "staff") return "/dashboard";
  return "/";
}

// ---------------------------------------------------------------------------
// Guest session helpers (local-only, no Supabase account required)
// ---------------------------------------------------------------------------

const GUEST_SESSION_KEY = "resq-guest-session";
const GUEST_UID_KEY = "resq-guest-uid";

function loadGuestSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(GUEST_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "uid" in parsed &&
      "isAnonymous" in parsed &&
      (parsed as Record<string, unknown>).isAnonymous === true
    ) {
      return parsed as AuthSession;
    }
    return null;
  } catch {
    return null;
  }
}

function saveGuestSession(session: AuthSession): void {
  localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(session));
}

function clearGuestSession(): void {
  localStorage.removeItem(GUEST_SESSION_KEY);
}

function createGuestSession(): AuthSession {
  // Reuse a stable local UID so offline drafts stay consistent across page loads
  const existingUid = localStorage.getItem(GUEST_UID_KEY);
  const uid =
    existingUid ??
    (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? `guest-${crypto.randomUUID()}`
      : `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

  if (!existingUid) {
    localStorage.setItem(GUEST_UID_KEY, uid);
  }

  return {
    uid,
    role: "public",
    displayName: "Guest",
    email: null,
    isAnonymous: true,
    staffOrg: null,
  };
}

// ---------------------------------------------------------------------------

let initializePromise: Promise<void> | null = null;
let authListenerBound = false;

function normalizeRole(role: string | null | undefined): AppRole {
  if (role === "admin" || role === "staff") return role;
  return "public";
}

function getUserMetadata(user: User) {
  return typeof user.user_metadata === "object" && user.user_metadata ? user.user_metadata : {};
}

async function fetchOrCreateProfile(user: User): Promise<ProfileRecord> {
  const metadata = getUserMetadata(user) as Record<string, unknown>;
  const fallback: ProfileRecord = {
    id: user.id,
    email: user.email ?? null,
    display_name:
      typeof metadata.full_name === "string"
        ? metadata.full_name
        : user.email?.split("@")[0] ?? "ResQ User",
    role: "public",
    staff_org: null,
  };

  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, display_name, role, staff_org")
      .eq("id", user.id)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    if (data) {
      return data as ProfileRecord;
    }

    const { error: upsertError } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        email: fallback.email,
        display_name: fallback.display_name,
        role: "public",
        staff_org: null,
      },
      {
        onConflict: "id",
      },
    );

    if (upsertError) {
      throw upsertError;
    }

    return fallback;
  } catch (error) {
    console.warn("Unable to hydrate auth profile; falling back to public profile.", error);
    return fallback;
  }
}

async function resolveSessionFromUser(user: User): Promise<AuthSession> {
  const profile = await fetchOrCreateProfile(user);

  return {
    uid: user.id,
    role: normalizeRole(profile.role),
    displayName: profile.display_name ?? user.email?.split("@")[0] ?? "ResQ User",
    email: profile.email ?? user.email ?? null,
    isAnonymous: false,
    staffOrg: profile.staff_org ?? null,
  };
}

function bindSupabaseAuthListener(
  setState: (partial: Partial<AuthState>) => void,
  getState: () => Pick<AuthState, "session">,
) {
  if (!supabase || authListenerBound) return;

  supabase.auth.onAuthStateChange((_event, session: Session | null) => {
    void (async () => {
      if (!session?.user) {
        // Don't evict an active guest session when Supabase fires a null event.
        // The guest session is local-only and unaffected by Supabase sign-in state.
        if (getState().session?.isAnonymous) return;

        setState({
          session: null,
          backend: "supabase",
          isReady: true,
          isLoading: false,
          authError: null,
        });
        return;
      }

      // A real Supabase user signed in — clear any lingering guest session.
      clearGuestSession();

      setState({
        backend: "supabase",
        isLoading: true,
      });

      try {
        const nextSession = await resolveSessionFromUser(session.user);

        setState({
          session: nextSession,
          backend: "supabase",
          isReady: true,
          isLoading: false,
          authError: null,
        });
      } catch (error) {
        setState({
          session: null,
          backend: "supabase",
          isReady: true,
          isLoading: false,
          authError: error instanceof Error ? error.message : "Unable to resolve session.",
        });
      }
    })();
  });

  authListenerBound = true;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  backend: "supabase",
  isReady: false,
  isLoading: false,
  authError: null,

  async initializeAuth() {
    if (get().isReady && !get().isLoading) {
      return;
    }

    if (initializePromise) {
      return initializePromise;
    }

    initializePromise = (async () => {
      set({
        backend: "supabase",
        isLoading: true,
      });

      if (!supabase) {
        set({
          backend: "supabase",
          session: null,
          isReady: true,
          isLoading: false,
          authError: "Supabase is not configured.",
        });
        return;
      }

      bindSupabaseAuthListener((partial) => set(partial), () => get());

      const { data, error } = await supabase.auth.getSession();

      if (error) {
        set({
          backend: "supabase",
          session: null,
          isReady: true,
          isLoading: false,
          authError: error.message,
        });
        return;
      }

      if (!data.session?.user) {
        // No Supabase session — restore a persisted guest session if one exists.
        const guestSession = loadGuestSession();
        set({
          backend: "supabase",
          session: guestSession,
          isReady: true,
          isLoading: false,
          authError: null,
        });
        return;
      }

      try {
        const nextSession = await resolveSessionFromUser(data.session.user);

        set({
          backend: "supabase",
          session: nextSession,
          isReady: true,
          isLoading: false,
          authError: null,
        });
      } catch (sessionError) {
        set({
          backend: "supabase",
          session: null,
          isReady: true,
          isLoading: false,
          authError: sessionError instanceof Error ? sessionError.message : "Unable to resolve session.",
        });
      }
    })().finally(() => {
      initializePromise = null;
    });

    return initializePromise;
  },

  async signIn({ email, password }) {
    if (!supabase) {
      const message = "Supabase is not configured.";
      set({
        isLoading: false,
        authError: message,
      });
      throw new Error(message);
    }

    set({
      isLoading: true,
      authError: null,
    });

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      set({
        isLoading: false,
        authError: error.message,
      });
      throw new Error(error.message);
    }

    const signedInUser = data.user ?? data.session?.user;

    if (!signedInUser) {
      const message = "Authentication failed.";
      set({
        isLoading: false,
        authError: message,
      });
      throw new Error(message);
    }

    const nextSession = await resolveSessionFromUser(signedInUser);
    clearGuestSession();

    set({
      session: nextSession,
      backend: "supabase",
      isReady: true,
      isLoading: false,
      authError: null,
    });

    return nextSession;
  },

  async signUp({ fullName, email, password }) {
    if (!supabase) {
      const message = "Supabase is not configured.";
      set({
        isLoading: false,
        authError: message,
      });
      throw new Error(message);
    }

    set({
      isLoading: true,
      authError: null,
    });

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: fullName?.trim() ? { full_name: fullName.trim() } : undefined,
        emailRedirectTo: import.meta.env.VITE_SUPABASE_AUTH_REDIRECT_URL?.trim() || undefined,
      },
    });

    if (error) {
      set({
        isLoading: false,
        authError: error.message,
      });
      throw new Error(error.message);
    }

    const signedUpUser = data.user ?? data.session?.user;

    if (!signedUpUser) {
      const message = "Account created. Check your email to continue.";
      set({
        isLoading: false,
        authError: message,
      });
      throw new Error(message);
    }

    const nextSession = await resolveSessionFromUser(signedUpUser);
    clearGuestSession();

    set({
      session: nextSession,
      backend: "supabase",
      isReady: true,
      isLoading: false,
      authError: null,
    });

    return nextSession;
  },

  async signOut() {
    // Always clear local guest state first.
    clearGuestSession();

    // If the current session is a guest, no Supabase call is needed.
    if (get().session?.isAnonymous) {
      set({
        session: null,
        backend: "supabase",
        isReady: true,
        isLoading: false,
        authError: null,
      });
      return;
    }

    if (!supabase) {
      const message = "Supabase is not configured.";
      set({
        isLoading: false,
        authError: message,
      });
      throw new Error(message);
    }

    set({
      isLoading: true,
      authError: null,
    });

    const { error } = await supabase.auth.signOut();

    if (error) {
      set({
        isLoading: false,
        authError: error.message,
      });
      throw new Error(error.message);
    }

    set({
      session: null,
      backend: "supabase",
      isReady: true,
      isLoading: false,
      authError: null,
    });
  },

  enterGuestMode() {
    const guestSession = createGuestSession();
    saveGuestSession(guestSession);
    set({
      session: guestSession,
      backend: "supabase",
      isReady: true,
      isLoading: false,
      authError: null,
    });
  },

  clearAuthError() {
    set({
      authError: null,
    });
  },
}));

