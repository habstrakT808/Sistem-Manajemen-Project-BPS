// File: src/app/pegawai/projects/page.tsx
// UPDATED: Use new ProjectListView component

"use client";

import React, { Suspense } from "react";
import ProjectListView from "@/components/pegawai/ProjectListView";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export const dynamic = "force-dynamic";

function ProjectsPageContent() {
  return <ProjectListView />;
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ProjectsPageContent />
    </Suspense>
  );
}
