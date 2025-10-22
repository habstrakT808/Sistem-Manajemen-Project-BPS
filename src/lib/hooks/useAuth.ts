"use client";

import { useEffect, useState, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/../database/types/database.types";
import { useQueryClient } from "@tanstack/react-query";

type UserRole = Database["public"]["Enums"]["user_role"];

interface AuthUser extends User {
  user_metadata: {
    role?: UserRole;
    nama_lengkap?: string;
  };
}

interface UseAuthReturn {
  user: AuthUser | null;
  userProfile: Database["public"]["Tables"]["users"]["Row"] | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<
    Database["public"]["Tables"]["users"]["Row"] | null
  >(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const queryClient = useQueryClient();

  const fetchUserProfile = useCallback(
    async (
      userId: string,
      retryCount: number = 0,
    ): Promise<Database["public"]["Tables"]["users"]["Row"] | null> => {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", userId)
          .single<Database["public"]["Tables"]["users"]["Row"]>();

        if (error) {
          console.error("=== fetchUserProfile: Error fetching profile:", error);
          console.error("=== fetchUserProfile: Error details:", {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
          });

          // Retry up to 3 times with exponential backoff
          if (retryCount < 3) {
            const delay = Math.pow(2, retryCount) * 500; // 500ms, 1s, 2s
            await new Promise((resolve) => setTimeout(resolve, delay));
            return fetchUserProfile(userId, retryCount + 1);
          }

          return null;
        }

        return data;
      } catch (err) {
        console.error("=== fetchUserProfile: Exception fetching profile:", err);

        // Retry up to 3 times with exponential backoff
        if (retryCount < 3) {
          const delay = Math.pow(2, retryCount) * 500;
          await new Promise((resolve) => setTimeout(resolve, delay));
          return fetchUserProfile(userId, retryCount + 1);
        }

        return null;
      }
    },
    [supabase],
  );

  const refreshUser = useCallback(async () => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        setUser(null);
        setUserProfile(null);
        setLoading(false);
        return;
      }

      setUser(user as AuthUser);

      if (user) {
        const profile = await fetchUserProfile(user.id);
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    } catch {
      setUser(null);
      setUserProfile(null);
      setLoading(false);
    }
  }, [supabase.auth, fetchUserProfile]);

  const signOut = async () => {
    setLoading(true);

    // Start cleanup immediately while trying to sign out from Supabase
    const performCleanup = async () => {
      try {
        // Clear React state immediately
        setUser(null);
        setUserProfile(null);
        setLoading(false);

        // Clear all browser storage
        if (typeof window !== "undefined") {
          // Clear localStorage and sessionStorage
          window.localStorage.clear();
          window.sessionStorage.clear();

          // Clear auth-related cookies
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
        }

        // Clear React Query cache
        try {
          queryClient.clear();
          queryClient.invalidateQueries();
          queryClient.removeQueries();
        } catch (err) {
          console.warn("Error clearing React Query cache:", err);
        }

        // Force navigation to home page
        if (typeof window !== "undefined") {
          window.location.href = "/";
        }
      } catch (cleanupError) {
        console.error("Error during cleanup:", cleanupError);

        // Final fallback - force navigation even if cleanup fails
        if (typeof window !== "undefined") {
          window.location.href = "/";
        }
      }
    };

    // Try to sign out from Supabase with a shorter timeout
    try {
      // Create a timeout promise with shorter duration
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Logout timeout")), 2000); // 2 second timeout
      });

      // Create the signOut promise
      const signOutPromise = supabase.auth.signOut({
        scope: "global",
      });

      // Race between signOut and timeout
      const result = (await Promise.race([
        signOutPromise,
        timeoutPromise,
      ])) as any;

      if (result?.error) {
        console.warn("Supabase signOut error:", result.error);
      } else {
      }

      // Perform cleanup regardless of signOut result
      await performCleanup();
    } catch (error) {
      console.warn("Supabase signOut failed or timed out:", error);

      // Perform cleanup even if signOut fails
      await performCleanup();
    }
  };

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        // Get initial session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (session?.user) {
          setUser(session.user as AuthUser);
          const profile = await fetchUserProfile(session.user.id);
          if (mounted) {
            setUserProfile(profile);
          }
        }

        if (mounted) {
          setLoading(false);
        }
      } catch {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Force loading to false after 2 seconds
    const forceTimeout = setTimeout(() => {
      if (mounted) {
        setLoading(false);
      }
    }, 2000);

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === "SIGNED_IN" && session?.user) {
        setUser(session.user as AuthUser);
        const profile = await fetchUserProfile(session.user.id);
        if (mounted) {
          setUserProfile(profile);
          setLoading(false);
        }
      } else if (event === "SIGNED_OUT") {
        if (mounted) {
          setUser(null);
          setUserProfile(null);
          setLoading(false);
          queryClient.clear();
        }
      }
    });

    initAuth();

    return () => {
      mounted = false;
      clearTimeout(forceTimeout);
      subscription.unsubscribe();
    };
  }, [supabase.auth, fetchUserProfile, queryClient]);

  return {
    user,
    userProfile,
    loading,
    signOut,
    refreshUser,
  };
}
