// File: src/app/ketua-tim/page.tsx

"use client";

import { KetuaTimDashboard } from "@/components/ketua-tim";
import { Suspense } from "react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export default function KetuaTimDashboardPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <KetuaTimDashboard />
    </Suspense>
  );
}
