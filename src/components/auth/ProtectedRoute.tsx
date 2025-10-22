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

      // Special handling for /pegawai/projects with team_id - check this FIRST before requireProjectRole
      const currentPath =
        typeof window !== "undefined" ? window.location.pathname : "";
      const hasTeamId =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("team_id")
          : null;

      if (currentPath === "/pegawai/projects" && hasTeamId) {
        // Allow access to projects page with team_id regardless of activeProject/activeTeam
        // The ProjectListView component will handle the team_id and show appropriate projects
        return;
      }

      if (requireProjectRole) {
        // For ketua-tim pages, check if user has leader role in active project/team
        if (requireProjectRole === "leader") {
          // Wait for userProfile to load
          if (loading) {
            return; // Still loading, wait
          }

          // If userProfile is still undefined after loading, wait a bit more
          if (!userProfile && !loading) {
            // Wait maximum 3 seconds for userProfile to load
            setTimeout(() => {
              if (!userProfile) {
                console.log(
                  "UserProfile still undefined after timeout, proceeding with access check",
                );
              }
            }, 3000);
            // Don't return here, continue with access check
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

          // If userProfile is undefined but we have activeProject or activeTeam with leader role, allow access
          if (!userProfile && (isLeaderInProject || isLeaderInTeam)) {
            console.log(
              "Allowing access based on activeProject/activeTeam role despite undefined userProfile",
            );
            return;
          }

          // Special case: If userProfile is undefined and no activeProject/activeTeam,
          // but we're accessing ketua-tim pages, allow access temporarily
          if (!userProfile && !activeProject && !activeTeam) {
            console.log(
              "Allowing temporary access to ketua-tim pages despite undefined userProfile and no activeProject/activeTeam",
            );
            return;
          }

          if (!isLeaderInProject && !isLeaderInTeam && !isDatabaseKetuaTim) {
            console.log(
              "User not authorized for ketua-tim access:",
              userProfile?.role,
              "Project role:",
              activeProject?.role,
              "Team role:",
              activeTeam?.role,
            );
            // Only redirect if we're actually trying to access ketua-tim pages
            if (currentPath.startsWith("/ketua-tim")) {
              router.prefetch("/pegawai");
              router.push("/pegawai");
              return;
            }
          }
        }

        // Allow access if either an active project OR an active team matches the role.
        // This lets team leaders access `/ketua-tim` after picking a team, even
        // when no specific project has been selected yet.
        if (!activeProject && !activeTeam && !getStoredRole()) {
          // Don't redirect if user is already on /pegawai/projects with team_id
          if (currentPath !== "/pegawai/projects" || !hasTeamId) {
            router.prefetch("/pegawai/projects");
            router.push("/pegawai/projects");
            return;
          }
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

  // Show loading spinner while auth is initializing
  if (loading) {
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

    // Special handling for /pegawai/projects with team_id
    const currentPath =
      typeof window !== "undefined" ? window.location.pathname : "";
    const hasTeamId =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("team_id")
        : null;

    if (currentPath === "/pegawai/projects" && hasTeamId) {
      // Allow access to projects page with team_id regardless of activeProject/activeTeam
      return <>{children}</>;
    }

    // Special case: If userProfile is undefined and we're on ketua-tim pages, allow temporary access
    // This prevents white screen while userProfile is loading
    if (!userProfile && currentPath.startsWith("/ketua-tim")) {
      console.log(
        "Rendering ketua-tim page despite undefined userProfile (temporary access)",
      );
      return <>{children}</>;
    }

    if (!resolvedRole) {
      console.log("No resolved role found, showing loading spinner");
      return <LoadingSpinner />;
    }
    if (resolvedRole !== requireProjectRole) return null;
  }

  return <>{children}</>;
}
