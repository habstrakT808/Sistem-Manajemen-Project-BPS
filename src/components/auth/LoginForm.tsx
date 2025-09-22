"use client";

import React, { useEffect, useState } from "react";
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

  // Reset form state when user logs out or when component mounts
  useEffect(() => {
    console.log(
      "LoginForm useEffect - user changed:",
      user?.id,
      "loading:",
      loading
    );
    if (!user) {
      console.log("Resetting form state - user is null");
      setLoading(false);
      setError("");
      setEmail("");
      setPassword("");
      setShowPassword(false);
      setFormKey((prev) => prev + 1); // Force form re-render
    }
  }, [user, loading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setLoading(false);
      setError("");
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("LoginForm handleSubmit - starting login");
    setLoading(true);
    setError("");

    try {
      // Clear stale client-side caches before logging in with a different user
      if (typeof window !== "undefined") {
        try {
          window.localStorage.removeItem("ACTIVE_PROJECT");
          window.localStorage.removeItem("ACTIVE_TEAM");
          window.localStorage.removeItem("REACT_QUERY_OFFLINE_CACHE");
          const keysToRemove: string[] = [];
          for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i);
            if (
              key &&
              (key.startsWith("REACT_QUERY_") || key.startsWith("ACTIVE_"))
            ) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach((k) => window.localStorage.removeItem(k));
        } catch (err) {
          console.warn("LoginForm: failed clearing localStorage keys", err);
        }
      }

      // Ensure any residual session is cleared (handles rapid relogin same account)
      try {
        await supabase.auth.signOut();
      } catch {}

      const { data, error: authError } = await supabase.auth.signInWithPassword(
        {
          email,
          password,
        }
      );

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      const signedInUser = data.user ?? (data.session as any)?.user;

      if (signedInUser) {
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

        // Decide destination: prefer explicit role param, else profile role
        const redirectPath = role
          ? role === "admin"
            ? "/admin"
            : role === "ketua_tim"
              ? "/ketua-tim"
              : "/pegawai"
          : userProfile.role === "admin"
            ? "/admin"
            : "/pegawai";

        console.log("LoginForm - redirecting to:", redirectPath);
        setLoading(false); // release button BEFORE navigating to avoid stuck spinner if redirected back
        router.prefetch(redirectPath);
        router.push(redirectPath);
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
                onChange={(e) => setEmail(e.target.value)}
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
                  onChange={(e) => setPassword(e.target.value)}
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
