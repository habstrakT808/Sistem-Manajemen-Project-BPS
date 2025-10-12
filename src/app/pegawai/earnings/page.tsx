// File: src/app/pegawai/earnings/page.tsx
// UPDATED: Use new EarningsAnalytics component

import EarningsAnalytics from "@/components/pegawai/EarningsAnalytics";
import { Suspense } from "react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export const dynamic = "force-dynamic";

function EarningsPageContent() {
  return <EarningsAnalytics />;
}

export default function EarningsPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <EarningsPageContent />
    </Suspense>
  );
}
