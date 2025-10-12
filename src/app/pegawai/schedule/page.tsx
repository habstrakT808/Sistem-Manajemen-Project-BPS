// File: src/app/pegawai/schedule/page.tsx

import { PersonalSchedule } from "@/components/pegawai";
import { Suspense } from "react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export const dynamic = "force-dynamic";

function SchedulePageContent() {
  return <PersonalSchedule />;
}

export default function SchedulePage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <SchedulePageContent />
    </Suspense>
  );
}
