// File: src/app/ketua-tim/team/[id]/page.tsx

import { MemberDetail } from "@/components/ketua-tim";

interface MemberDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function MemberDetailPage({
  params,
}: MemberDetailPageProps) {
  const { id } = await params;
  return <MemberDetail memberId={id} />;
}
