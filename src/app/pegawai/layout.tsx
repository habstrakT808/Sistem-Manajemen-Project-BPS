// File: src/app/pegawai/layout.tsx

"use client";

import { PegawaiLayout } from "@/components/layout/PegawaiLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { usePathname, useSearchParams } from "next/navigation";
import { useActiveTeam } from "@/components/providers";
import { Suspense } from "react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export const dynamic = "force-dynamic";

function PegawaiLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { activeTeam } = useActiveTeam();

  // Don't use sidebar layout for:
  // 1. Team selection page (/pegawai)
  const isTeamSelectionPage = pathname === "/pegawai";

  // 2. Project selection page (/pegawai/projects with team_id but no project selected)
  const isProjectSelectionPage =
    pathname === "/pegawai/projects" && searchParams.get("team_id");

  // 3. Settings page - always standalone
  const isStandaloneSettings = pathname === "/pegawai/settings";

  // Show standalone layout (no sidebar) for these pages
  if (isTeamSelectionPage || isProjectSelectionPage || isStandaloneSettings) {
    return (
      <ErrorBoundary>
        <ProtectedRoute>{children}</ProtectedRoute>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <ProtectedRoute>
        <PegawaiLayout>{children}</PegawaiLayout>
      </ProtectedRoute>
    </ErrorBoundary>
  );
}

export default function PegawaiLayoutPage({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <PegawaiLayoutContent>{children}</PegawaiLayoutContent>
    </Suspense>
  );
}
