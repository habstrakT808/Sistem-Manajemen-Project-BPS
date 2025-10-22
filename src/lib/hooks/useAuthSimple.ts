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

    // Force timeout after 5 seconds
    const forceTimeout = setTimeout(() => {
      if (mounted) {
        setLoading(false);
        setError("Authentication timeout - forced to false");
      }
    }, 5000);

    const initAuth = async () => {
      try {
        const supabase = createClient();

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

        if (mounted) {
          setUser(session?.user || null);
          setError(null);
          setLoading(false);
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
    };
  }, []);

  return { user, loading, error };
}
