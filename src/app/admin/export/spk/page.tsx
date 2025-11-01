import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { SPKForm } from "@/components/admin/SPKForm";

export default function SPKPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <SPKForm />
    </ProtectedRoute>
  );
}
