// File: src/app/ketua-tim/team/[id]/page.tsx

"use client";

import { MemberDetail } from "@/components/ketua-tim";
import { useParams } from "next/navigation";

export default function MemberDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id || "";
  return <MemberDetail memberId={id} />;
}
