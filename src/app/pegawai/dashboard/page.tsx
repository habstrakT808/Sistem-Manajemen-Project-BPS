// File: src/app/pegawai/dashboard/page.tsx
// NEW: Separate dashboard page for detailed metrics

import { PegawaiDashboard } from "@/components/pegawai";
import { Suspense } from "react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export const dynamic = "force-dynamic";

function PegawaiDashboardContent() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <PegawaiDashboard />
    </Suspense>
  );
}

export default function PegawaiDetailDashboardPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <PegawaiDashboardContent />
    </Suspense>
  );
}
