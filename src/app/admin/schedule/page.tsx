import AdminSchedule from "@/components/admin/AdminSchedule";
import { Suspense } from "react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export const dynamic = "force-dynamic";

function PageContent() {
  return <AdminSchedule />;
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <PageContent />
    </Suspense>
  );
}
