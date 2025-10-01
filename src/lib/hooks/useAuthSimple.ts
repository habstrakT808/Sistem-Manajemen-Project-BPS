"use client";

import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

interface UseAuthSimpleReturn {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export function useAuthSimple(): UseAuthSimpleReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    console.log("=== useAuthSimple: Starting initialization ===");

    // Force timeout after 5 seconds
    const forceTimeout = setTimeout(() => {
      if (mounted) {
        console.log(
          "=== useAuthSimple: FORCE TIMEOUT - Setting loading to false ===",
        );
        setLoading(false);
        setError("Authentication timeout - forced to false");
      }
    }, 5000);

    const initAuth = async () => {
      try {
        console.log("=== useAuthSimple: Creating Supabase client ===");
        const supabase = createClient();

        console.log("=== useAuthSimple: Getting session ===");
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("=== useAuthSimple: Session error ===", sessionError);
          if (mounted) {
            setError(sessionError.message);
            setUser(null);
            setLoading(false);
          }
          return;
        }

        console.log("=== useAuthSimple: Session result ===", !!session?.user);

        if (mounted) {
          setUser(session?.user || null);
          setError(null);
          setLoading(false);
          console.log("=== useAuthSimple: Auth initialization completed ===");
        }
      } catch (err) {
        console.error("=== useAuthSimple: Initialization error ===", err);
        if (mounted) {
          setError(err instanceof Error ? err.message : "Unknown error");
          setUser(null);
          setLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      mounted = false;
      clearTimeout(forceTimeout);
      console.log("=== useAuthSimple: Cleanup ===");
    };
  }, []);

  // Log state changes
  useEffect(() => {
    console.log("=== useAuthSimple State ===", {
      loading,
      hasUser: !!user,
      userId: user?.id,
      error,
    });
  }, [loading, user, error]);

  return { user, loading, error };
}
