"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, LogIn, Shield, User } from "lucide-react";
import { Database } from "@/../database/types/database.types";
import { useAuthContext } from "@/components/auth/AuthProvider";

type UserRole = Database["public"]["Enums"]["user_role"];

const roleConfig = {
  admin: {
    title: "Admin",
    description: "Kelola pengguna dan sistem",
    icon: Shield,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
  pegawai: {
    title: "Pegawai",
    description: "Kelola tugas dan project",
    icon: User,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  ketua_tim: {
    title: "Ketua Tim",
    description: "Kelola tim dan project",
    icon: User,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
  },
};

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formKey, setFormKey] = useState(0);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [sessionKey, setSessionKey] = useState(() => Date.now()); // Unique session identifier

  // Track user interaction to prevent auto-redirect during typing
  const isUserInteracting = useRef(false);
  const interactionTimeout = useRef<NodeJS.Timeout | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get("role") as UserRole | null;
  const supabase = createClient();
  const { refreshUser, user } = useAuthContext();

  const config = role ? roleConfig[role] : roleConfig.admin;
  const IconComponent = config.icon;

  // Prefetch likely destinations to speed up redirect after login
  useEffect(() => {
    router.prefetch("/admin");
    router.prefetch("/pegawai");
    if (role) {
      const path = role === "admin" ? "/admin" : "/pegawai";
      router.prefetch(path);
    }
  }, [router, role]);

  // Complete state reset when URL role parameter changes
  useEffect(() => {
    console.log(
      "LoginForm - URL role parameter changed to:",
      role,
      "- performing complete state reset",
    );
    setIsRedirecting(false);
    setLoading(false);
    setError("");
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setSessionKey(Date.now()); // Generate new session key for complete isolation
    setFormKey((prev) => prev + 1);
  }, [role]);

  // Reset form state when user logs out or when component mounts
  useEffect(() => {
    console.log(
      "LoginForm useEffect - user changed:",
      user?.id,
      "loading:",
      loading,
    );
    if (!user && !loading) {
      console.log(
        "Resetting form state - user is null, generating new session",
      );
      setLoading(false);
      // Don't reset error here - let it persist to show login errors
      // setError("");
      setEmail("");
      setPassword("");
      setShowPassword(false);
      setIsRedirecting(false); // Reset redirect flag
      setSessionKey(Date.now()); // Generate new session key for complete isolation
      setFormKey((prev) => prev + 1); // Force form re-render
    }
  }, [user, loading]); // Include 'loading' dependency but check it in condition

  // Auto-redirect authenticated users to their dashboard
  useEffect(() => {
    // Only auto-redirect if user is authenticated AND not manually trying to login with different role
    const urlRole = searchParams.get("role");
    // Prevent auto-redirect if user is actively interacting with the form or if there's a role parameter indicating manual login attempt
    const isManualLoginAttempt = isUserInteracting.current || urlRole;
    const shouldAutoRedirect =
      user && !loading && !isRedirecting && !isManualLoginAttempt;

    console.log("LoginForm - Auto-redirect check:", {
      user: !!user,
      loading,
      isRedirecting,
      isUserInteracting: isUserInteracting.current,
      urlRole,
      isManualLoginAttempt,
      shouldAutoRedirect,
    });

    if (shouldAutoRedirect) {
      const currentSessionKey = sessionKey;
      console.log(
        "LoginForm - User already authenticated, auto-redirecting... Session:",
        currentSessionKey,
      );
      setIsRedirecting(true);

      // Determine redirect path based on user role from database (ignore URL parameter to prevent conflicts)
      const getUserDashboardPath = async () => {
        try {
          // Check if session is still valid (prevent stale redirects)
          if (currentSessionKey !== sessionKey) {
            console.log("LoginForm - Session changed, aborting redirect");
            return;
          }

          const { data: userProfile, error: _profileError } = await supabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single();

          // Type assertion for userProfile
          const typedUserProfile = userProfile as {
            role: "admin" | "ketua_tim" | "pegawai";
          } | null;

          // Double-check session is still valid
          if (currentSessionKey !== sessionKey) {
            console.log(
              "LoginForm - Session changed during profile fetch, aborting redirect",
            );
            return;
          }

          // Always use database role to prevent URL parameter conflicts
          let redirectPath = "/pegawai"; // default fallback

          if (typedUserProfile?.role) {
            redirectPath =
              typedUserProfile.role === "admin"
                ? "/admin"
                : typedUserProfile.role === "ketua_tim"
                  ? "/ketua-tim"
                  : "/pegawai";
          }

          console.log(
            "LoginForm - Auto-redirecting to:",
            redirectPath,
            "based on database role:",
            typedUserProfile?.role,
            "Session:",
            currentSessionKey,
          );

          // Use a timeout to prevent race conditions and check session one more time
          setTimeout(() => {
            if (currentSessionKey === sessionKey) {
              window.location.href = redirectPath;
            } else {
              console.log(
                "LoginForm - Session changed before redirect, aborting",
              );
            }
          }, 150);
        } catch (error) {
          console.error("Error getting user profile for redirect:", error);
          // Fallback redirect with session check
          setTimeout(() => {
            if (currentSessionKey === sessionKey) {
              window.location.href = "/pegawai";
            }
          }, 150);
        }
      };

      getUserDashboardPath();
    }
  }, [user, loading, supabase, isRedirecting, sessionKey, searchParams]); // Removed email and password to prevent keystroke loops

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setLoading(false);
      setError("");
      // Clear interaction timeout
      if (interactionTimeout.current) {
        clearTimeout(interactionTimeout.current);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newSessionKey = Date.now();
    console.log(
      "LoginForm handleSubmit - starting login with new session:",
      newSessionKey,
    );

    // Complete state reset for new login attempt
    setLoading(true);
    setError("");
    setIsRedirecting(false);
    setSessionKey(newSessionKey); // Generate new session key for complete isolation

    try {
      // Clear ALL browser storage before logging in to prevent conflicts
      if (typeof window !== "undefined") {
        try {
          console.log(
            "Clearing all browser storage before login, session:",
            newSessionKey,
          );

          // Clear localStorage completely
          window.localStorage.clear();

          // Clear sessionStorage completely
          window.sessionStorage.clear();

          // Clear any React component state remnants
          if (window.history && window.history.replaceState) {
            window.history.replaceState(
              null,
              "",
              window.location.pathname + window.location.search,
            );
          }

          // Clear any IndexedDB data (React Query offline cache)
          if ("indexedDB" in window) {
            try {
              const databases = await indexedDB.databases();
              await Promise.all(
                databases.map((db) => {
                  if (db.name) {
                    return new Promise<void>((resolve, reject) => {
                      const deleteReq = indexedDB.deleteDatabase(db.name!);
                      deleteReq.onsuccess = () => resolve();
                      deleteReq.onerror = () => reject(deleteReq.error);
                      deleteReq.onblocked = () => {
                        console.warn(`IndexedDB ${db.name} deletion blocked`);
                        resolve(); // Continue anyway
                      };
                    });
                  }
                  return Promise.resolve();
                }),
              );
            } catch (err) {
              console.warn("Failed to clear IndexedDB:", err);
            }
          }

          // Clear any cookies related to auth
          document.cookie.split(";").forEach((cookie) => {
            const eqPos = cookie.indexOf("=");
            const name =
              eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
            if (
              name.includes("supabase") ||
              name.includes("auth") ||
              name.includes("session")
            ) {
              document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
              document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
            }
          });
        } catch (err) {
          console.warn("LoginForm: failed clearing browser storage", err);
        }
      }

      // Ensure any residual session is cleared (handles rapid relogin same account)
      try {
        await supabase.auth.signOut({
          scope: "global", // Clear all sessions
        });
      } catch (err) {
        console.warn("Error during pre-login signOut:", err);
      }

      // Add a delay to ensure all cleanup is processed
      await new Promise((resolve) => setTimeout(resolve, 200));

      const { data, error: authError } = await supabase.auth.signInWithPassword(
        {
          email,
          password,
        },
      );

      if (authError) {
        console.error("Authentication error:", authError);

        // Provide user-friendly error messages
        let errorMessage = "Terjadi kesalahan saat login";

        if (
          authError.message.includes("Invalid login credentials") ||
          authError.message.includes("invalid_grant") ||
          authError.message.includes("Invalid credentials")
        ) {
          errorMessage =
            "Email atau password yang Anda masukkan salah. Silakan periksa kembali.";
        } else if (authError.message.includes("Email not confirmed")) {
          errorMessage =
            "Email Anda belum dikonfirmasi. Silakan periksa email Anda.";
        } else if (authError.message.includes("Too many requests")) {
          errorMessage =
            "Terlalu banyak percobaan login. Silakan tunggu beberapa saat.";
        } else if (authError.message.includes("User not found")) {
          errorMessage = "Akun dengan email tersebut tidak ditemukan.";
        } else {
          // For any other errors, show the original message but make it more user-friendly
          errorMessage = `Login gagal: ${authError.message}`;
        }

        console.log("Setting error message:", errorMessage);
        setError(errorMessage);
        setLoading(false);
        return;
      }

      const signedInUser = data.user ?? (data.session as any)?.user;

      if (signedInUser) {
        // Wait for auth context to update before proceeding
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Make sure context is in sync before navigating
        await refreshUser();

        // Fetch minimal profile fields for speed
        const { data: userProfile, error: profileError } = await supabase
          .from("users")
          .select("role,is_active")
          .eq("id", signedInUser.id)
          .single<
            Pick<
              Database["public"]["Tables"]["users"]["Row"],
              "role" | "is_active"
            >
          >();

        if (profileError || !userProfile) {
          setError("Error fetching user profile");
          setLoading(false);
          return;
        }

        if (!userProfile.is_active) {
          setError("Akun Anda tidak aktif. Hubungi administrator.");
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        // Validate role if specified in URL parameter
        if (role && role !== userProfile.role) {
          let roleDisplayName = "";
          switch (userProfile.role) {
            case "admin":
              roleDisplayName = "Admin";
              break;
            case "ketua_tim":
              roleDisplayName = "Ketua Tim";
              break;
            case "pegawai":
              roleDisplayName = "Pegawai";
              break;
            default:
              roleDisplayName = "Unknown";
          }

          setError(
            `Anda tidak memiliki akses ke halaman ini. Role Anda adalah: ${roleDisplayName}`,
          );
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        // Decide destination based on user's actual role
        const redirectPath =
          userProfile.role === "admin"
            ? "/admin"
            : userProfile.role === "ketua_tim"
              ? "/ketua-tim"
              : "/pegawai";

        console.log(
          "LoginForm - redirecting to:",
          redirectPath,
          "session:",
          newSessionKey,
        );
        setLoading(false); // release button BEFORE navigating to avoid stuck spinner if redirected back

        // Direct navigation without session validation since we're in the same login flow
        setTimeout(() => {
          window.location.href = redirectPath;
        }, 100);
      } else {
        // Safety: handle edge case where user is null without explicit error
        setError("Login gagal. Silakan coba lagi.");
        setLoading(false);
        return;
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("Terjadi kesalahan saat login");
      setLoading(false);
    }
  };

  // Handle user interaction to prevent auto-redirect during typing
  const handleUserInteraction = () => {
    isUserInteracting.current = true;

    // Clear error when user starts typing again
    if (error) {
      setError("");
    }

    // Clear existing timeout
    if (interactionTimeout.current) {
      clearTimeout(interactionTimeout.current);
    }

    // Set timeout to reset interaction flag after user stops typing
    interactionTimeout.current = setTimeout(() => {
      isUserInteracting.current = false;
    }, 2000); // 2 seconds after user stops typing
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className={`w-full max-w-md ${config.borderColor} border-2`}>
        <CardHeader className="text-center">
          <div
            className={`w-16 h-16 ${config.bgColor} rounded-xl flex items-center justify-center mx-auto mb-4`}
          >
            <IconComponent className={`w-8 h-8 ${config.color}`} />
          </div>

          <CardTitle className="text-2xl">Login {config.title}</CardTitle>

          <CardDescription>{config.description}</CardDescription>
        </CardHeader>

        <CardContent>
          <form key={formKey} onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  handleUserInteraction();
                }}
                placeholder="nama@example.com"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    handleUserInteraction();
                  }}
                  placeholder="Masukkan password"
                  required
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Logging in...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <LogIn className="w-4 h-4" />
                  <span>Login</span>
                </div>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 mb-2">Belum punya akun?</p>
            <p className="text-sm text-gray-500">
              Hubungi administrator untuk mendapatkan akses
            </p>
          </div>

          <div className="mt-4 text-center">
            <Button
              variant="outline"
              onClick={() => router.push("/")}
              className="text-sm"
            >
              ← Kembali ke Beranda
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
