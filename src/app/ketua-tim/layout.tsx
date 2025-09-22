// File: src/app/ketua-tim/layout.tsx

import { KetuaTimLayout } from "@/components/layout/KetuaTimLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function KetuaTimLayoutPage({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute requireProjectRole="leader">
      <KetuaTimLayout>{children}</KetuaTimLayout>
    </ProtectedRoute>
  );
}
