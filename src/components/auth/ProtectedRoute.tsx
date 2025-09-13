"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "./AuthProvider";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { Database } from "@/../database/types/database.types";

type UserRole = Database["public"]["Enums"]["user_role"];

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requireAuth?: boolean;
}

export function ProtectedRoute({
  children,
  allowedRoles,
  requireAuth = true,
}: ProtectedRouteProps) {
  const { user, userProfile, loading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (requireAuth && !user) {
        router.push("/auth/login");
        return;
      }

      if (
        user &&
        userProfile &&
        allowedRoles &&
        !allowedRoles.includes(userProfile.role)
      ) {
        // Redirect to appropriate dashboard based on role
        switch (userProfile.role) {
          case "admin":
            router.push("/admin");
            break;
          case "ketua_tim":
            router.push("/ketua-tim");
            break;
          case "pegawai":
            router.push("/pegawai");
            break;
          default:
            router.push("/");
        }
        return;
      }
    }
  }, [user, userProfile, loading, allowedRoles, requireAuth, router]);

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

  return <>{children}</>;
}
