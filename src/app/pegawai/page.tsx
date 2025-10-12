// File: src/app/pegawai/page.tsx

import TeamListView from "@/components/pegawai/TeamListView";
import { Suspense } from "react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export const dynamic = "force-dynamic";

function PegawaiLandingContent() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <TeamListView />
    </Suspense>
  );
}

export default function PegawaiLandingPickerPage() {
  // Landing for picking a team; not wrapped by sidebar-specific content
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <PegawaiLandingContent />
    </Suspense>
  );
}
