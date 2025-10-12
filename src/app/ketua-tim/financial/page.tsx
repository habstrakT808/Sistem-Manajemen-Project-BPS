// File: src/app/ketua-tim/financial/page.tsx

"use client";

import { FinancialDashboard } from "@/components/ketua-tim";
import { Suspense } from "react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export default function FinancialPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <FinancialDashboard />
    </Suspense>
  );
}
