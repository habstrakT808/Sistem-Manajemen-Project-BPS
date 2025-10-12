// File: src/app/ketua-tim/layout.tsx

import { KetuaTimLayout } from "@/components/layout/KetuaTimLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

export default function KetuaTimLayoutPage({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary>
      <ProtectedRoute requireProjectRole="leader">
        <KetuaTimLayout>{children}</KetuaTimLayout>
      </ProtectedRoute>
    </ErrorBoundary>
  );
}
