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
    ): Promise<Database["public"]["Tables"]["users"]["Row"] | null> => {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", userId)
          .single<Database["public"]["Tables"]["users"]["Row"]>();

        if (error) {
          return null;
        }

        return data;
      } catch {
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
    console.log("Signing out user - starting logout process");
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
          console.log("Clearing browser storage...");

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

          console.log("Browser storage cleared successfully");
        }

        // Clear React Query cache
        try {
          console.log("Clearing React Query cache...");
          queryClient.clear();
          queryClient.invalidateQueries();
          queryClient.removeQueries();
          console.log("React Query cache cleared successfully");
        } catch (err) {
          console.warn("Error clearing React Query cache:", err);
        }

        console.log("Logout cleanup completed, navigating to home page...");

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
      console.log("Calling supabase.auth.signOut()...");

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
        console.log("Supabase signOut completed successfully");
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
