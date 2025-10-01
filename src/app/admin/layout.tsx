import { AdminLayout } from "@/components/layout/AdminLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function AdminLayoutPage({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AdminLayout>{children}</AdminLayout>
    </ProtectedRoute>
  );
}
