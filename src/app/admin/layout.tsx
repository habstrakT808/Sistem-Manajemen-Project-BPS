import { AdminLayout } from "@/components/layout/AdminLayout";

export default function AdminLayoutPage({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayout>{children}</AdminLayout>;
}
