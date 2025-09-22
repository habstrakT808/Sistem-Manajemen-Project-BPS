// File: src/app/pegawai/layout.tsx

import { PegawaiLayout } from "@/components/layout/PegawaiLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function PegawaiLayoutPage({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <PegawaiLayout>{children}</PegawaiLayout>
    </ProtectedRoute>
  );
}
