// File: src/app/ketua-tim/projects/[id]/page.tsx

import { ProjectDetail } from "@/components/ketua-tim";

interface ProjectDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = await params;
  return <ProjectDetail projectId={id} />;
}
