// File: src/app/pegawai/page.tsx

import TeamListView from "@/components/pegawai/TeamListView";

export default function PegawaiLandingPickerPage() {
  // Landing for picking a team; not wrapped by sidebar-specific content
  return <TeamListView />;
}
