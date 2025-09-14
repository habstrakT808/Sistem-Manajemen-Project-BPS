import ProjectEditForm from "@/components/ketua-tim/ProjectEditForm";

interface EditProjectPageProps {
  params: {
    id: string;
  };
}

export default function EditProjectPage({ params }: EditProjectPageProps) {
  return <ProjectEditForm projectId={params.id} />;
}
