// File: src/app/ketua-tim/analytics/page.tsx

"use client";

import { AnalyticsDashboard } from "@/components/ketua-tim";
import { Suspense } from "react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AnalyticsDashboard />
    </Suspense>
  );
}
