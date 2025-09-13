import { UserManagement } from "@/components/admin";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function UsersPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <UserManagement />
    </ProtectedRoute>
  );
}
