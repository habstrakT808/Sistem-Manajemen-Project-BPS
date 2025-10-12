// File: src/app/ketua-tim/team/page.tsx

"use client";

import { TeamManagement } from "@/components/ketua-tim";
import { Suspense } from "react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export default function TeamManagementPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <TeamManagement />
    </Suspense>
  );
}
