import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { SKTimForm } from "@/components/admin/SKTimForm";

export default function SKTimPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <SKTimForm />
    </ProtectedRoute>
  );
}
