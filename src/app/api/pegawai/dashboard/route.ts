// File: src/app/api/pegawai/dashboard/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface PegawaiDashboardStats {
  assigned_projects: number;
  active_tasks: number;
  completed_tasks: number;
  monthly_earnings: number;
  pending_reviews: number;
}

interface TodayTask {
  id: string;
  deskripsi_tugas: string;
  tanggal_tugas: string;
  status: "pending" | "in_progress" | "completed";
  project_name: string;
  response_pegawai?: string;
}

interface AssignedProject {
  id: string;
  nama_project: string;
  status: "upcoming" | "active" | "completed";
  deadline: string;
  ketua_tim_name: string;
  progress: number;
}

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

    // Get dashboard statistics using database function
    const { data: statsResult } = await supabase.rpc("get_dashboard_stats", {
      user_id: user.id,
    });

    const stats: PegawaiDashboardStats = {
      assigned_projects: statsResult?.assigned_projects || 0,
      active_tasks: statsResult?.active_tasks || 0,
      completed_tasks: statsResult?.completed_tasks || 0,
      monthly_earnings: statsResult?.monthly_earnings || 0,
      pending_reviews: statsResult?.pending_reviews || 0,
    };

    // Get today's tasks
    const today = new Date().toISOString().split("T")[0];
    const { data: todayTasks } = await supabase
      .from("tasks")
      .select(
        `
        id,
        deskripsi_tugas,
        tanggal_tugas,
        status,
        response_pegawai,
        projects!inner (nama_project)
      `
      )
      .eq("pegawai_id", user.id)
      .eq("tanggal_tugas", today)
      .order("created_at", { ascending: true });

    // Get assigned projects (active and upcoming)
    const { data: projectAssignments } = await supabase
      .from("project_assignments")
      .select(
        `
        projects!inner (
          id,
          nama_project,
          status,
          deadline,
          users!inner (nama_lengkap)
        )
      `
      )
      .eq("assignee_type", "pegawai")
      .eq("assignee_id", user.id)
      .in("projects.status", ["upcoming", "active"])
      .limit(5);

    // Format today's tasks
    const formattedTodayTasks: TodayTask[] = (todayTasks || []).map(
      (task: {
        id: string;
        deskripsi_tugas: string;
        tanggal_tugas: string;
        status: string;
        response_pegawai?: string;
        projects: { nama_project: string };
      }) => ({
        id: task.id,
        deskripsi_tugas: task.deskripsi_tugas,
        tanggal_tugas: task.tanggal_tugas,
        status: task.status as "pending" | "in_progress" | "completed",
        project_name: task.projects.nama_project,
        response_pegawai: task.response_pegawai,
      })
    );

    // Format assigned projects with progress calculation
    const formattedProjects = await Promise.all(
      (projectAssignments || []).map(
        async (assignment: {
          projects: {
            id: string;
            nama_project: string;
            status: string;
            deadline: string;
            users: { nama_lengkap: string };
          };
        }): Promise<AssignedProject> => {
          const project = assignment.projects;

          // Calculate progress based on my completed tasks in this project
          const { data: myTasks } = await supabase
            .from("tasks")
            .select("status")
            .eq("project_id", project.id)
            .eq("pegawai_id", user.id);

          let progress = 0;
          if (myTasks && myTasks.length > 0) {
            const completedTasks = myTasks.filter(
              (task: { status: string }) => task.status === "completed"
            ).length;
            progress = Math.round((completedTasks / myTasks.length) * 100);
          }

          return {
            id: project.id,
            nama_project: project.nama_project,
            status: project.status as "upcoming" | "active" | "completed",
            deadline: project.deadline,
            ketua_tim_name: project.users.nama_lengkap,
            progress,
          };
        }
      )
    );

    return NextResponse.json({
      stats,
      today_tasks: formattedTodayTasks,
      assigned_projects: formattedProjects,
    });
  } catch (error) {
    console.error("Pegawai Dashboard API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
