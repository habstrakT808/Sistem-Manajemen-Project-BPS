"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { useActiveProject, useActiveTeam } from "@/components/providers";
import { Database } from "@/../database/types/database.types";

type UserRole = Database["public"]["Enums"]["user_role"];

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requireAuth?: boolean;
  requireProjectRole?: "leader" | "member";
}

export function ProtectedRoute({
  children,
  allowedRoles,
  requireAuth = true,
  requireProjectRole,
}: ProtectedRouteProps) {
  const { user, userProfile, loading } = useAuthContext();
  const { activeProject } = useActiveProject();
  const { activeTeam } = useActiveTeam();
  const router = useRouter();

  // Resolve role with a fast localStorage fallback to avoid blank screens
  const getStoredRole = (): "leader" | "member" | undefined => {
    if (typeof window === "undefined") return undefined;
    try {
      const rawTeam = window.localStorage.getItem("ACTIVE_TEAM");
      const team = rawTeam
        ? (JSON.parse(rawTeam) as { role?: "leader" | "member" })
        : null;
      if (team?.role) return team.role;
      const rawProject = window.localStorage.getItem("ACTIVE_PROJECT");
      const project = rawProject
        ? (JSON.parse(rawProject) as { role?: "leader" | "member" })
        : null;
      return project?.role ?? undefined;
    } catch {
      return undefined;
    }
  };

  useEffect(() => {
    console.log("ProtectedRoute check:", {
      loading,
      user: !!user,
      userProfile: userProfile?.role,
      requireProjectRole,
      activeProject,
      activeTeam,
      pathname: window.location.pathname,
      timestamp: new Date().toISOString(),
    });

    if (!loading) {
      if (requireAuth && !user) {
        router.prefetch("/auth/login");
        router.push("/auth/login");
        return;
      }

      if (
        user &&
        userProfile &&
        allowedRoles &&
        !allowedRoles.includes(userProfile.role)
      ) {
        switch (userProfile.role) {
          case "admin":
            router.prefetch("/admin");
            router.push("/admin");
            break;
          case "pegawai":
            router.prefetch("/pegawai");
            router.push("/pegawai");
            break;
          default:
            router.prefetch("/");
            router.push("/");
        }
        return;
      }

      if (requireProjectRole) {
        // For ketua-tim pages, check if user has leader role in active project/team
        if (requireProjectRole === "leader") {
          // Wait for userProfile to load
          if (loading) {
            console.log("Still loading userProfile, waiting...");
            return; // Still loading, wait
          }

          console.log("Checking ketua-tim access:", {
            userProfile: userProfile?.role,
            activeProject: activeProject?.role,
            activeTeam: activeTeam?.role,
            hasUserProfile: !!userProfile,
          });

          // Allow access if user is leader in active project or team
          const isLeaderInProject = activeProject?.role === "leader";
          const isLeaderInTeam = activeTeam?.role === "leader";
          const isDatabaseKetuaTim = userProfile?.role === "ketua_tim";

          if (!isLeaderInProject && !isLeaderInTeam && !isDatabaseKetuaTim) {
            console.log(
              "User not authorized for ketua-tim access:",
              userProfile?.role,
              "Project role:",
              activeProject?.role,
              "Team role:",
              activeTeam?.role
            );
            router.prefetch("/pegawai");
            router.push("/pegawai");
            return;
          }
        }

        // Allow access if either an active project OR an active team matches the role.
        // This lets team leaders access `/ketua-tim` after picking a team, even
        // when no specific project has been selected yet.
        if (!activeProject && !activeTeam && !getStoredRole()) {
          router.prefetch("/pegawai/projects");
          router.push("/pegawai/projects");
          return;
        }

        const resolvedRole =
          activeProject?.role ?? activeTeam?.role ?? getStoredRole();
        if (resolvedRole && resolvedRole !== requireProjectRole) {
          const dest = resolvedRole === "leader" ? "/ketua-tim" : "/pegawai";
          router.prefetch(dest);
          router.push(dest);
          return;
        }
      }
    }
  }, [
    user,
    userProfile,
    loading,
    allowedRoles,
    requireAuth,
    requireProjectRole,
    activeProject,
    activeTeam,
    router,
  ]);

  // If we're still loading auth state but already have a session, allow rendering
  // to avoid blocking on slow profile fetches. Only block when we require auth
  // and no user session is present yet.
  if (loading && !(requireAuth && !user)) {
    // Proceed to render children while background loading continues
  } else if (loading) {
    return <LoadingSpinner />;
  }

  if (requireAuth && !user) {
    return null;
  }

  if (
    user &&
    userProfile &&
    allowedRoles &&
    !allowedRoles.includes(userProfile.role)
  ) {
    return null;
  }

  if (requireProjectRole) {
    const resolvedRole =
      activeProject?.role ?? activeTeam?.role ?? getStoredRole();
    if (!resolvedRole) return null;
    if (resolvedRole !== requireProjectRole) return null;
  }

  return <>{children}</>;
}
