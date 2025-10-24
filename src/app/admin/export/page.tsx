import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ExportDashboard } from "@/components/admin/ExportDashboard";

export default function ExportPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <ExportDashboard />
    </ProtectedRoute>
  );
}
