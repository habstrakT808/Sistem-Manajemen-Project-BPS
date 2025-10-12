// File: src/app/ketua-tim/tasks/page.tsx

"use client";

import { TaskManagement } from "@/components/ketua-tim";
import { Suspense } from "react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export default function TasksPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <TaskManagement />
    </Suspense>
  );
}
