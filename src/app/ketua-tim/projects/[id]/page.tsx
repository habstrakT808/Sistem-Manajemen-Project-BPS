// File: src/app/ketua-tim/projects/[id]/page.tsx

import { ProjectDetail } from "@/components/ketua-tim";

interface ProjectDetailPageProps {
  params: {
    id: string;
  };
}

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  return <ProjectDetail projectId={params.id} />;
}
