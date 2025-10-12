// File: src/app/ketua-tim/projects/page.tsx

"use client";

import { ProjectList } from "@/components/ketua-tim";
import { Suspense } from "react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export default function ProjectsPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ProjectList />
    </Suspense>
  );
}
