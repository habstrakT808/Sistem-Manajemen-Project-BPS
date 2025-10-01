// File: src/components/providers.tsx
// UPDATED: Enhanced providers with better caching and persistence

"use client";

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { Toaster } from "@/components/ui/sonner";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

type ActiveProject = {
  id: string;
  role: "leader" | "member";
} | null;

interface ActiveProjectContextValue {
  activeProject: ActiveProject;
  setActiveProject: (project: ActiveProject) => void;
  clearActiveProject: () => void;
}

const ActiveProjectContext = createContext<
  ActiveProjectContextValue | undefined
>(undefined);

export function useActiveProject() {
  const ctx = useContext(ActiveProjectContext);
  if (!ctx)
    throw new Error(
      "useActiveProject must be used within ActiveProjectProvider",
    );
  return ctx;
}

function ActiveProjectProvider({ children }: { children: React.ReactNode }) {
  const [activeProject, setActive] = useState<ActiveProject>(null);

  useEffect(() => {
    try {
      const raw =
        typeof window !== "undefined"
          ? window.localStorage.getItem("ACTIVE_PROJECT")
          : null;
      if (raw) setActive(JSON.parse(raw));
    } catch {}
  }, []);

  const setActiveProject = (project: ActiveProject) => {
    setActive(project);
    try {
      if (typeof window !== "undefined") {
        if (project)
          window.localStorage.setItem(
            "ACTIVE_PROJECT",
            JSON.stringify(project),
          );
        else window.localStorage.removeItem("ACTIVE_PROJECT");
      }
    } catch {}
  };

  const clearActiveProject = () => setActiveProject(null);

  const value = useMemo(
    () => ({ activeProject, setActiveProject, clearActiveProject }),
    // clearActiveProject is stable because it's derived from setActiveProject defined in this component
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeProject],
  );

  return (
    <ActiveProjectContext.Provider value={value}>
      {children}
    </ActiveProjectContext.Provider>
  );
}

// Active Team (for team picker)
type ActiveTeam = { id: string; role: "leader" | "member" } | null;
interface ActiveTeamContextValue {
  activeTeam: ActiveTeam;
  setActiveTeam: (team: ActiveTeam) => void;
  clearActiveTeam: () => void;
}
const ActiveTeamContext = createContext<ActiveTeamContextValue | undefined>(
  undefined,
);
export function useActiveTeam() {
  const ctx = useContext(ActiveTeamContext);
  if (!ctx)
    throw new Error("useActiveTeam must be used within ActiveTeamProvider");
  return ctx;
}
function ActiveTeamProvider({ children }: { children: React.ReactNode }) {
  const [activeTeam, setActive] = useState<ActiveTeam>(null);
  useEffect(() => {
    try {
      const raw =
        typeof window !== "undefined"
          ? window.localStorage.getItem("ACTIVE_TEAM")
          : null;
      if (raw) setActive(JSON.parse(raw));
    } catch {}
  }, []);
  const setActiveTeam = (team: ActiveTeam) => {
    setActive(team);
    try {
      if (typeof window !== "undefined") {
        if (team)
          window.localStorage.setItem("ACTIVE_TEAM", JSON.stringify(team));
        else window.localStorage.removeItem("ACTIVE_TEAM");
      }
    } catch {}
  };
  const clearActiveTeam = () => setActiveTeam(null);

  const value = useMemo(
    () => ({ activeTeam, setActiveTeam, clearActiveTeam }),
    // clearActiveTeam is stable because it's derived from setActiveTeam defined in this component
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeTeam],
  );
  return (
    <ActiveTeamContext.Provider value={value}>
      {children}
    </ActiveTeamContext.Provider>
  );
}

// Create persister for localStorage
const persister =
  typeof window !== "undefined"
    ? createSyncStoragePersister({
        storage: window.localStorage,
        key: "REACT_QUERY_OFFLINE_CACHE",
        serialize: JSON.stringify,
        deserialize: JSON.parse,
      })
    : undefined;

// Create query client with optimized settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: (failureCount, error: unknown) => {
        // Don't retry on 4xx errors
        if (error && typeof error === "object" && "status" in error) {
          const status = (error as { status: number }).status;
          if (status >= 400 && status < 500) {
            return false;
          }
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: true,
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

// Persist query client if persister is available
if (persister) {
  persistQueryClient({
    queryClient,
    persister,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    buster: "v1.0.0", // Change this to invalidate all cached data
  });
}

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ActiveProjectProvider>
          <ActiveTeamProvider>{children}</ActiveTeamProvider>
        </ActiveProjectProvider>
        <Toaster
          position="top-right"
          expand={true}
          richColors={true}
          closeButton={true}
          toastOptions={{
            duration: 4000,
            className: "font-medium",
          }}
        />
        {mounted && process.env.NODE_ENV === "development" && (
          <ReactQueryDevtools
            initialIsOpen={false}
            buttonPosition="bottom-right"
          />
        )}
      </AuthProvider>
    </QueryClientProvider>
  );
}
