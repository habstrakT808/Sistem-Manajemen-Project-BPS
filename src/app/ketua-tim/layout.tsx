// File: src/app/ketua-tim/layout.tsx

import { KetuaTimLayout } from "@/components/layout/KetuaTimLayout";

export default function KetuaTimLayoutPage({
  children,
}: {
  children: React.ReactNode;
}) {
  return <KetuaTimLayout>{children}</KetuaTimLayout>;
}
