// File: src/app/api/ketua-tim/dashboard/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface DashboardStats {
  my_projects: number;
  active_projects: number;
  team_members: number;
  pending_tasks: number;
  monthly_budget: number;
}

interface ProjectSummary {
  id: string;
  nama_project: string;
  status: "upcoming" | "active" | "completed";
  deadline: string;
  progress: number;
  team_size: number;
  created_at: string;
}

interface TaskSummary {
  id: string;
  deskripsi_tugas: string;
  pegawai_name: string;
  tanggal_tugas: string;
  status: "pending" | "in_progress" | "completed";
  project_name: string;
}

export async function GET(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createClient()) as any;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "30"; // days

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
      (userProfile as { role: string }).role !== "ketua_tim"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get dashboard statistics using database function
    const { data: statsResult } = await supabase.rpc("get_dashboard_stats", {
      user_id: user.id,
    });

    const stats: DashboardStats = {
      my_projects: statsResult?.my_projects || 0,
      active_projects: statsResult?.active_projects || 0,
      team_members: statsResult?.team_members || 0,
      pending_tasks: statsResult?.pending_tasks || 0,
      monthly_budget: statsResult?.monthly_budget || 0,
    };

    // Get recent projects (last 5)
    const { data: recentProjects } = await supabase
      .from("projects")
      .select(
        `
        id,
        nama_project,
        status,
        deadline,
        created_at
      `
      )
      .eq("ketua_tim_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    // Get pending tasks (urgent ones - next 7 days)
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const { data: pendingTasks } = await supabase
      .from("tasks")
      .select(
        `
        id,
        deskripsi_tugas,
        tanggal_tugas,
        status,
        users!inner (nama_lengkap),
        projects!inner (nama_project, ketua_tim_id)
      `
      )
      .eq("projects.ketua_tim_id", user.id)
      .eq("status", "pending")
      .lte("tanggal_tugas", sevenDaysFromNow)
      .order("tanggal_tugas", { ascending: true })
      .limit(10);

    // Enrich projects with team size and progress
    const enrichedProjects = await Promise.all(
      (recentProjects || []).map(
        async (project: {
          id: string;
          nama_project: string;
          status: string;
          deadline: string;
          created_at: string;
        }): Promise<ProjectSummary> => {
          // Get team size
          const { data: assignments } = await supabase
            .from("project_assignments")
            .select("id")
            .eq("project_id", project.id);

          const team_size = (assignments || []).length;

          // Calculate progress based on completed tasks vs total tasks
          const { data: allTasks } = await supabase
            .from("tasks")
            .select("status")
            .eq("project_id", project.id);

          let progress = 0;
          if (allTasks && allTasks.length > 0) {
            const completedTasks = allTasks.filter(
              (task: { status: string }) => task.status === "completed"
            ).length;
            progress = Math.round((completedTasks / allTasks.length) * 100);
          } else {
            // If no tasks, calculate based on timeline
            const startDate = new Date(project.created_at);
            const endDate = new Date(project.deadline);
            const currentDate = new Date();

            if (currentDate >= endDate) {
              progress = 100;
            } else if (currentDate <= startDate) {
              progress = 0;
            } else {
              const totalDuration = endDate.getTime() - startDate.getTime();
              const elapsedDuration =
                currentDate.getTime() - startDate.getTime();
              progress = Math.round((elapsedDuration / totalDuration) * 100);
            }
          }

          return {
            id: project.id,
            nama_project: project.nama_project,
            status: project.status as "upcoming" | "active" | "completed",
            deadline: project.deadline,
            progress: Math.max(0, Math.min(100, progress)),
            team_size,
            created_at: project.created_at,
          };
        }
      )
    );

    // Format pending tasks
    const formattedTasks: TaskSummary[] = (pendingTasks || []).map(
      (task: {
        id: string;
        deskripsi_tugas: string;
        tanggal_tugas: string;
        status: string;
        users: { nama_lengkap: string };
        projects: { nama_project: string };
      }) => ({
        id: task.id,
        deskripsi_tugas: task.deskripsi_tugas,
        pegawai_name: task.users.nama_lengkap,
        tanggal_tugas: task.tanggal_tugas,
        status: task.status as "pending" | "in_progress" | "completed",
        project_name: task.projects.nama_project,
      })
    );

    return NextResponse.json({
      stats,
      recent_projects: enrichedProjects,
      pending_tasks: formattedTasks,
      period_days: parseInt(period),
    });
  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
