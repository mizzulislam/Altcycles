import * as React from "react";
import { toast } from "sonner";
import { findDemoProfileByEmail, setDemoCurrentUser } from "@/lib/data-service";
import { IDLE_TIMEOUT_MINUTES, isDemoMode, supabase } from "@/lib/supabase";
import type { ProfileRow, UserRole } from "@/types/database.types";

export interface SignUpResult {
  needsConfirmation: boolean;
  user: ProfileRow | null;
  message?: string;
}

interface AuthContextValue {
  profile: ProfileRow | null;
  loading: boolean;
  isDemoMode: boolean;
  signIn: (emailOrUsername: string, password: string) => Promise<ProfileRow>;
  signUp: (payload: {
    usernameOrEmail: string;
    password: string;
    fullName: string;
  }) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

const DEMO_STORAGE_KEY = "altcycles_demo_session_email";

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
  const [profile, setProfile] = React.useState<ProfileRow | null>(null);
  const [loading, setLoading] = React.useState(true);

  const loadSupabaseProfile = React.useCallback(
    async (userId: string): Promise<ProfileRow | null> => {
      if (!supabase) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (error || !data || !data.is_active) {
        await supabase.auth.signOut();
        return null;
      }
      return data;
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
        (_event, session) => {
          if (!session?.user) {
            setProfile(null);
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
    if (isDemoMode || !supabase) {
      window.sessionStorage.removeItem(DEMO_STORAGE_KEY);
      setDemoCurrentUser(null);
      setProfile(null);
      return;
    }
    await supabase.auth.signOut();
    setProfile(null);
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

      setProfile(loaded);
      return loaded;
    },
    [loadSupabaseProfile],
  );

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
      if (password.length < 6) {
        throw new Error("Kata sandi minimal 6 karakter.");
      }

      const email = rawInput.includes("@")
        ? rawInput
        : `${rawInput.toLowerCase()}@altvira.id`;
      const isSuperAdminEmail =
        email.toLowerCase() === "mizzulislam.id@gmail.com";

      if (isDemoMode || !supabase) {
        const newDemoProfile: ProfileRow = {
          id: crypto.randomUUID(),
          email,
          full_name: fullName,
          role: isSuperAdminEmail ? "super_admin" : "user",
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
            role: isSuperAdminEmail ? "super_admin" : "user",
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

  const value = React.useMemo<AuthContextValue>(
    () => ({
      profile,
      loading,
      isDemoMode,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      updatePassword,
    }),
    [
      profile,
      loading,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      updatePassword,
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

