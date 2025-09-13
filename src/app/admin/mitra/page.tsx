import { MitraManagement } from "@/components/admin";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function MitraPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <MitraManagement />
    </ProtectedRoute>
  );
}
