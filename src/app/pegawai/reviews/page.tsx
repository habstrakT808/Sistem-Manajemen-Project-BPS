// File: src/app/pegawai/reviews/page.tsx

import { ReviewManagement } from "@/components/pegawai/ReviewManagement";
import { Suspense } from "react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export const dynamic = "force-dynamic";

function ReviewsPageContent() {
  return <ReviewManagement />;
}

export default function ReviewsPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ReviewsPageContent />
    </Suspense>
  );
}
