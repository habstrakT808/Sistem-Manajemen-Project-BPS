// File: src/app/pegawai/layout.tsx

import { PegawaiLayout } from "@/components/layout/PegawaiLayout";

export default function PegawaiLayoutPage({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PegawaiLayout>{children}</PegawaiLayout>;
}
