// File: src/app/api/pegawai/projects/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createClient()) as any;

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role validation
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !userProfile ||
      (userProfile as { role: string }).role !== "pegawai"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get assigned projects
    const { data: projectAssignments, error: assignmentsError } = await supabase
      .from("project_assignments")
      .select(
        `
        uang_transport,
        projects!inner (
          id,
          nama_project,
          deskripsi,
          tanggal_mulai,
          deadline,
          status,
          created_at,
          users!inner (nama_lengkap, email)
        )
      `
      )
      .eq("assignee_type", "pegawai")
      .eq("assignee_id", user.id)
      .order("projects(created_at)", { ascending: false });

    if (assignmentsError) {
      throw assignmentsError;
    }

    // Enrich with task statistics and team info
    const enrichedProjects = await Promise.all(
      (projectAssignments || []).map(
        async (assignment: {
          uang_transport: number;
          projects: {
            id: string;
            nama_project: string;
            deskripsi: string;
            tanggal_mulai: string;
            deadline: string;
            status: string;
            created_at: string;
            users: { nama_lengkap: string; email: string };
          };
        }) => {
          const project = assignment.projects;

          // Get my task statistics for this project
          const { data: myTasks } = await supabase
            .from("tasks")
            .select("status")
            .eq("project_id", project.id)
            .eq("pegawai_id", user.id);

          const taskStats = {
            pending: (myTasks || []).filter(
              (t: { status: string }) => t.status === "pending"
            ).length,
            in_progress: (myTasks || []).filter(
              (t: { status: string }) => t.status === "in_progress"
            ).length,
            completed: (myTasks || []).filter(
              (t: { status: string }) => t.status === "completed"
            ).length,
            total: (myTasks || []).length,
          };

          // Calculate my progress
          const progress =
            taskStats.total > 0
              ? Math.round((taskStats.completed / taskStats.total) * 100)
              : 0;

          // Get team size
          const { data: teamAssignments } = await supabase
            .from("project_assignments")
            .select("id")
            .eq("project_id", project.id);

          const team_size = (teamAssignments || []).length;

          return {
            id: project.id,
            nama_project: project.nama_project,
            deskripsi: project.deskripsi,
            tanggal_mulai: project.tanggal_mulai,
            deadline: project.deadline,
            status: project.status,
            created_at: project.created_at,
            ketua_tim: project.users,
            uang_transport: assignment.uang_transport,
            my_task_stats: taskStats,
            my_progress: progress,
            team_size,
          };
        }
      )
    );

    return NextResponse.json({ data: enrichedProjects });
  } catch (error) {
    console.error("Pegawai Projects API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
