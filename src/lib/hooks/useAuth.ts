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
      userId: string
    ): Promise<Database["public"]["Tables"]["users"]["Row"] | null> => {
      try {
        console.log("Fetching user profile for:", userId);
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", userId)
          .single<Database["public"]["Tables"]["users"]["Row"]>();

        if (error) {
          console.error("Error fetching user profile:", error);
          return null;
        }

        console.log("User profile fetched:", (data as any)?.role);
        return data;
      } catch (error) {
        console.error("Error fetching user profile:", error);
        return null;
      }
    },
    [supabase]
  );

  const refreshUser = useCallback(async () => {
    try {
      console.log("RefreshUser started");
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.error("Error getting user:", error);
        setUser(null);
        setUserProfile(null);
        setLoading(false);
        return;
      }

      console.log("RefreshUser - user found:", user?.id);
      setUser(user as AuthUser);

      if (user) {
        const profile = await fetchUserProfile(user.id);
        console.log("Setting userProfile:", profile?.role);
        setUserProfile(profile);
      } else {
        console.log("No user, setting userProfile to null");
        setUserProfile(null);
      }

      console.log("RefreshUser completed, setting loading to false");
      setLoading(false);
    } catch (error) {
      console.error("Error refreshing user:", error);
      setUser(null);
      setUserProfile(null);
      setLoading(false);
    }
  }, [supabase.auth, fetchUserProfile]);

  const signOut = async () => {
    try {
      console.log("Signing out user");
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error signing out:", error);
      }
      setUser(null);
      setUserProfile(null);

      // Clear all user-related data from localStorage and React Query cache
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("ACTIVE_PROJECT");
        window.localStorage.removeItem("ACTIVE_TEAM");
        window.localStorage.removeItem("REACT_QUERY_OFFLINE_CACHE");
        // Clear any other user-specific data
        const keysToRemove = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (
            key &&
            (key.startsWith("REACT_QUERY_") || key.startsWith("ACTIVE_"))
          ) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((key) => window.localStorage.removeItem(key));
      }

      // Clear React Query cache and invalidate all queries
      queryClient.clear();
      queryClient.invalidateQueries();

      console.log("Sign out completed, setting loading to false");
      setLoading(false);
    } catch (error) {
      console.error("Error signing out:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log("InitializeAuth started, mounted:", mounted);
        // Get initial session
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Error getting session:", error);
          if (mounted) {
            setUser(null);
            setUserProfile(null);
            setLoading(false);
          }
          return;
        }

        console.log("InitializeAuth - session found:", !!session?.user);
        if (session?.user && mounted) {
          setUser(session.user as AuthUser);
          const profile = await fetchUserProfile(session.user.id);
          if (mounted) {
            setUserProfile(profile);
          }
        } else if (mounted) {
          setUser(null);
          setUserProfile(null);
        }

        if (mounted) {
          console.log("Setting loading to false after initializeAuth");
          setLoading(false);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
        if (mounted) {
          console.log("Setting loading to false after initializeAuth error");
          setUser(null);
          setUserProfile(null);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(
        "Auth state change:",
        event,
        "mounted:",
        mounted,
        "session:",
        !!session?.user
      );
      if (!mounted) return;

      if (event === "SIGNED_IN" && session?.user) {
        console.log("SIGNED_IN event, setting user and profile");
        setUser(session.user as AuthUser);
        const profile = await fetchUserProfile(session.user.id);
        console.log("SIGNED_IN profile:", profile?.role);
        if (mounted) {
          setUserProfile(profile);
        }
      } else if (event === "SIGNED_OUT") {
        console.log("SIGNED_OUT event, clearing user and profile");
        setUser(null);
        setUserProfile(null);

        // Clear all user-related data when signed out
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("ACTIVE_PROJECT");
          window.localStorage.removeItem("ACTIVE_TEAM");
          window.localStorage.removeItem("REACT_QUERY_OFFLINE_CACHE");
          // Clear any other user-specific data
          const keysToRemove = [];
          for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i);
            if (
              key &&
              (key.startsWith("REACT_QUERY_") || key.startsWith("ACTIVE_"))
            ) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach((key) => window.localStorage.removeItem(key));
        }

        // Clear React Query cache and invalidate all queries
        queryClient.clear();
        queryClient.invalidateQueries();
      }

      if (mounted) {
        console.log("Setting loading to false after auth state change:", event);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserProfile, supabase.auth]);

  return {
    user,
    userProfile,
    loading,
    signOut,
    refreshUser,
  };
}
