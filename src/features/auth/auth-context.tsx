import * as React from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import {
  findDemoProfileByEmail,
  setDemoCurrentUser,
  switchActiveRole,
} from "@/lib/data-service";
import {
  IDLE_TIMEOUT_MINUTES,
  isDemoMode,
  supabase,
  TAB_AUTH_STORAGE_KEY,
} from "@/lib/supabase";
import type { ProfileRow, UserRole } from "@/types/database.types";

export interface SignUpResult {
  needsConfirmation: boolean;
  user: ProfileRow | null;
  message?: string;
}

interface AuthContextValue {
  profile: ProfileRow | null;
  activeRole: UserRole | null;
  availableRoles: UserRole[];
  loading: boolean;
  isDemoMode: boolean;
  signIn: (emailOrUsername: string, password: string) => Promise<ProfileRow>;
  signInWithGoogle: () => Promise<void>;
  signUp: (payload: {
    usernameOrEmail: string;
    password: string;
    fullName: string;
  }) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  switchRole: (targetRole: UserRole) => Promise<void>;
  refreshProfile: () => Promise<ProfileRow | null>;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

const DEMO_STORAGE_KEY = "altcycles_demo_session_email";
const TAB_ROLE_STORAGE_KEY = "altcycles_tab_active_role";

function isValidRole(value: string | null): value is UserRole {
  return value === "super_admin" || value === "admin" || value === "user";
}

function roleForPathname(pathname: string): UserRole | null {
  if (pathname.startsWith("/super-admin")) return "super_admin";
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/user")) return "user";
  return null;
}

function readTabRoleFromSession(): UserRole | null {
  try {
    const raw = window.sessionStorage.getItem(TAB_ROLE_STORAGE_KEY);
    return isValidRole(raw) ? raw : null;
  } catch {
    return null;
  }
}

function writeTabRoleToSession(role: UserRole | null): void {
  try {
    if (role) {
      window.sessionStorage.setItem(TAB_ROLE_STORAGE_KEY, role);
    } else {
      window.sessionStorage.removeItem(TAB_ROLE_STORAGE_KEY);
    }
  } catch {
    // Abaikan jika sessionStorage dibatasi
  }
}

function readTabStoredUserId(): string | null {
  try {
    const raw = window.sessionStorage.getItem(TAB_AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      user?: { id?: string };
      currentSession?: { user?: { id?: string } };
    };
    return parsed?.user?.id ?? parsed?.currentSession?.user?.id ?? null;
  } catch {
    return null;
  }
}

export function portalHomeForRole(role: UserRole): string {
  switch (role) {
    case "super_admin":
      return "/super-admin/dashboard";
    case "admin":
      return "/admin/dashboard";
    case "user":
      return "/user/dashboard";
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const [profile, setProfile] = React.useState<ProfileRow | null>(null);
  const [tabRole, setTabRole] = React.useState<UserRole | null>(
    () => roleForPathname(window.location.pathname) ?? readTabRoleFromSession(),
  );
  const [loading, setLoading] = React.useState(true);
  const signingOutThisTabRef = React.useRef(false);

  const loadSupabaseProfile = React.useCallback(
    async (userId: string, retries = 3): Promise<ProfileRow | null> => {
      if (!supabase) return null;

      // 1. Coba baca profil dengan retry backoff (mengantisipasi jeda commit trigger PostgreSQL pada OAuth Google)
      for (let attempt = 0; attempt < retries; attempt++) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();

        if (data) {
          if (!data.is_active) {
            await supabase.auth.signOut();
            return null;
          }
          return data;
        }

        if (attempt < retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
        }
      }

      // 2. Failsafe: Jika profil belum terbentuk dari trigger, sinkronkan langsung dari sesi auth Google
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user && authData.user.id === userId) {
          const authUser = authData.user;
          const rawRole: UserRole = "user";
          const fullName =
            authUser.user_metadata?.full_name ||
            authUser.user_metadata?.name ||
            authUser.email?.split("@")[0] ||
            "Pengguna Altvira";

          const { data: inserted, error: insertErr } = await supabase
            .from("profiles")
            .upsert({
              id: userId,
              email: authUser.email || `${userId}@altvira.id`,
              full_name: fullName,
              role: rawRole,
              is_active: true,
            })
            .select()
            .maybeSingle();

          if (!insertErr && inserted) {
            return inserted;
          }
        }
      } catch {
        // Gagal membuat profil failsafe otomatis; lanjutkan proses signOut di bawah
      }

      await supabase.auth.signOut();
      return null;
    },
    [],
  );

  React.useEffect(() => {
    let active = true;

    async function bootstrap() {
      if (isDemoMode || !supabase) {
        const savedEmail = window.sessionStorage.getItem(DEMO_STORAGE_KEY);
        if (savedEmail) {
          const found = findDemoProfileByEmail(savedEmail);
          if (found && active) {
            setDemoCurrentUser(found.id);
            setProfile(found);
          }
        }
        if (active) setLoading(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (data.session?.user && active) {
        const loaded = await loadSupabaseProfile(data.session.user.id);
        if (active) setProfile(loaded);
      }
      if (active) setLoading(false);
    }

    void bootstrap();

    if (!isDemoMode && supabase) {
      const { data: listener } = supabase.auth.onAuthStateChange(
        (event, session) => {
          const storedUserId = readTabStoredUserId();

          if (event === "SIGNED_OUT" || !session?.user) {
            if (!signingOutThisTabRef.current && storedUserId) {
              return;
            }
            setProfile(null);
            return;
          }

          if (storedUserId && storedUserId !== session.user.id) {
            return;
          }

          void loadSupabaseProfile(session.user.id).then((loaded) => {
            if (active) setProfile(loaded);
          });
        },
      );
      return () => {
        active = false;
        listener.subscription.unsubscribe();
      };
    }

    return () => {
      active = false;
    };
  }, [loadSupabaseProfile]);

  const signOut = React.useCallback(async () => {
    signingOutThisTabRef.current = true;
    writeTabRoleToSession(null);
    setTabRole(null);
    if (isDemoMode || !supabase) {
      window.sessionStorage.removeItem(DEMO_STORAGE_KEY);
      setDemoCurrentUser(null);
      setProfile(null);
      signingOutThisTabRef.current = false;
      return;
    }
    try {
      await supabase.auth.signOut({ scope: "local" });
    } finally {
      window.sessionStorage.removeItem(TAB_AUTH_STORAGE_KEY);
      setProfile(null);
      signingOutThisTabRef.current = false;
    }
  }, []);

  // FR-A4: Sesi otomatis berakhir setelah tidak aktif (Idle Timeout)
  React.useEffect(() => {
    if (!profile) return;
    const timeoutMs = IDLE_TIMEOUT_MINUTES * 60 * 1000;
    let timerId: number | undefined;

    const resetTimer = () => {
      if (timerId !== undefined) {
        window.clearTimeout(timerId);
      }
      timerId = window.setTimeout(() => {
        void signOut().then(() => {
          toast.info(
            `Sesi Anda berakhir otomatis karena tidak aktif selama ${IDLE_TIMEOUT_MINUTES} menit.`,
          );
        });
      }, timeoutMs);
    };

    const events = ["mousedown", "keydown", "touchstart", "scroll"] as const;
    events.forEach((ev) => window.addEventListener(ev, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      if (timerId !== undefined) window.clearTimeout(timerId);
      events.forEach((ev) => window.removeEventListener(ev, resetTimer));
    };
  }, [profile, signOut]);

  const signIn = React.useCallback(
    async (emailOrUsername: string, password: string): Promise<ProfileRow> => {
      const trimmed = emailOrUsername.trim();
      const email = trimmed.includes("@")
        ? trimmed
        : `${trimmed.toLowerCase()}@altvira.id`;

      if (isDemoMode || !supabase) {
        if (!password || password.length < 4) {
          throw new Error("Kata sandi wajib diisi.");
        }
        const found =
          findDemoProfileByEmail(email) ||
          findDemoProfileByEmail(trimmed);
        if (!found) {
          throw new Error(
            "Akun tidak ditemukan atau telah dinonaktifkan oleh Super Admin.",
          );
        }
        window.sessionStorage.setItem(DEMO_STORAGE_KEY, found.email);
        setDemoCurrentUser(found.id);
        writeTabRoleToSession(found.role);
        setTabRole(found.role);
        setProfile(found);
        return found;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error || !data.user) {
        throw new Error(error?.message ?? "Username atau kata sandi tidak valid.");
      }

      const loaded = await loadSupabaseProfile(data.user.id);
      if (!loaded) {
        throw new Error(
          "Akun Anda berstatus nonaktif. Silakan hubungi Super Admin Altvira.",
        );
      }

      await supabase.rpc("touch_last_login");

      writeTabRoleToSession(loaded.role);
      setTabRole(loaded.role);
      setProfile(loaded);
      return loaded;
    },
    [loadSupabaseProfile],
  );

  const signInWithGoogle = React.useCallback(async () => {
    if (isDemoMode || !supabase) {
      const demo = findDemoProfileByEmail("superadmin@altvira.id");
      if (demo) {
        window.sessionStorage.setItem(DEMO_STORAGE_KEY, demo.email);
        setDemoCurrentUser(demo.id);
        setProfile(demo);
        return;
      }
      throw new Error("Mode demo lokal tidak dapat menjalankan Google OAuth.");
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/login`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }
  }, []);

  const signUp = React.useCallback(
    async (payload: {
      usernameOrEmail: string;
      password: string;
      fullName: string;
    }): Promise<SignUpResult> => {
      const rawInput = payload.usernameOrEmail.trim();
      const fullName = payload.fullName.trim();
      const password = payload.password;

      if (!fullName) {
        throw new Error("Nama lengkap wajib diisi.");
      }
      if (!rawInput) {
        throw new Error("Username wajib diisi.");
      }
      if (password.length < 8) {
        throw new Error("Kata sandi minimal 8 karakter.");
      }

      const email = rawInput.includes("@")
        ? rawInput
        : `${rawInput.toLowerCase()}@altvira.id`;

      if (isDemoMode || !supabase) {
        const newDemoProfile: ProfileRow = {
          id: crypto.randomUUID(),
          email,
          full_name: fullName,
          role: "user",
          is_active: true,
          created_by: null,
          last_login_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        window.sessionStorage.setItem(DEMO_STORAGE_KEY, email);
        setDemoCurrentUser(newDemoProfile.id);
        setProfile(newDemoProfile);
        return {
          needsConfirmation: false,
          user: newDemoProfile,
          message: "Akun demo berhasil dibuat dan langsung masuk.",
        };
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.session?.user) {
        const loaded = await loadSupabaseProfile(data.session.user.id);
        if (loaded) {
          setProfile(loaded);
          return {
            needsConfirmation: false,
            user: loaded,
            message: "Akun berhasil dibuat dan Anda telah masuk ke sistem.",
          };
        }
      }

      return {
        needsConfirmation: true,
        user: null,
        message:
          "Akun berhasil didaftarkan di Supabase! Silakan masuk dengan akun tersebut.",
      };
    },
    [loadSupabaseProfile],
  );

  const requestPasswordReset = React.useCallback(async (email: string) => {
    if (isDemoMode || !supabase) {
      if (!email.includes("@")) {
        throw new Error("Masukkan alamat email yang valid.");
      }
      return;
    }
    const redirectTo = `${window.location.origin}/reset-kata-sandi`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });
    if (error) throw new Error(error.message);
  }, []);

  const updatePassword = React.useCallback(async (newPassword: string) => {
    if (newPassword.length < 8) {
      throw new Error("Kata sandi baru wajib minimal 8 karakter.");
    }
    if (isDemoMode || !supabase) {
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  }, []);

  const availableRoles = React.useMemo<UserRole[]>(() => {
    if (!profile) return [];
    if (profile.roles && profile.roles.length > 0) {
      return profile.roles;
    }
    if (profile.role === "super_admin") return ["super_admin", "admin", "user"];
    if (profile.role === "admin") return ["admin", "user"];
    return ["user"];
  }, [profile]);

  const routeRole = roleForPathname(pathname);
  const syncingRoleRef = React.useRef<UserRole | null>(null);

  React.useEffect(() => {
    if (!profile) return;
    if (routeRole && availableRoles.includes(routeRole)) {
      if (tabRole !== routeRole) {
        setTabRole(routeRole);
      }
      writeTabRoleToSession(routeRole);
      if (profile.role !== routeRole && syncingRoleRef.current !== routeRole) {
        syncingRoleRef.current = routeRole;
        void switchActiveRole(routeRole)
          .then((updated) => {
            setProfile(updated);
          })
          .catch(() => {
            // Biarkan state UI tetap mengikuti routeRole bila sinkronisasi sementara gagal
          })
          .finally(() => {
            if (syncingRoleRef.current === routeRole) {
              syncingRoleRef.current = null;
            }
          });
      }
      return;
    }

    const stored = readTabRoleFromSession();
    const resolved =
      stored && availableRoles.includes(stored) ? stored : profile.role;
    if (tabRole !== resolved) {
      setTabRole(resolved);
    }
    if (stored !== resolved) {
      writeTabRoleToSession(resolved);
    }
  }, [profile, routeRole, availableRoles, tabRole]);

  const activeRole = React.useMemo<UserRole | null>(() => {
    if (!profile) return null;
    if (routeRole && availableRoles.includes(routeRole)) {
      return routeRole;
    }
    if (tabRole && availableRoles.includes(tabRole)) {
      return tabRole;
    }
    return profile.role;
  }, [profile, routeRole, availableRoles, tabRole]);

  const switchRole = React.useCallback(async (targetRole: UserRole) => {
    writeTabRoleToSession(targetRole);
    setTabRole(targetRole);
    const updated = await switchActiveRole(targetRole);
    setProfile(updated);
  }, []);

  const refreshProfile = React.useCallback(async () => {
    if (isDemoMode || !supabase) {
      if (profile) {
        const found = findDemoProfileByEmail(profile.email);
        if (found) {
          const cloned = structuredClone(found);
          setProfile(cloned);
          return cloned;
        }
      }
      return profile;
    }
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      const loaded = await loadSupabaseProfile(data.user.id);
      if (loaded) setProfile(loaded);
      return loaded;
    }
    return null;
  }, [profile, loadSupabaseProfile]);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      profile,
      activeRole,
      availableRoles,
      loading,
      isDemoMode,
      signIn,
      signInWithGoogle,
      signUp,
      signOut,
      requestPasswordReset,
      updatePassword,
      switchRole,
      refreshProfile,
    }),
    [
      profile,
      activeRole,
      availableRoles,
      loading,
      signIn,
      signInWithGoogle,
      signUp,
      signOut,
      requestPasswordReset,
      updatePassword,
      switchRole,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth harus dipanggil di dalam AuthProvider.");
  }
  return ctx;
}

