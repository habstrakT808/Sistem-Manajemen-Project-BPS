import ProjectEditForm from "@/components/ketua-tim/ProjectEditForm";

interface EditProjectPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditProjectPage({ params }: EditProjectPageProps) {
  const { id } = await params;
  return <ProjectEditForm projectId={id} />;
}
