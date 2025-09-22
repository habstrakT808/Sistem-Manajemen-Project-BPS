// File: src/app/api/pegawai/projects/route.ts
// NEW: Pegawai project listing (landing page after login)

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface ProjectData {
  project_id: string;
  project_name: string;
  project_description?: string;
  project_status: string;
  leader_name: string;
  status: string;
  start_date: string;
  end_date: string;
  deadline?: string;
  user_role?: string;
  team_size?: number;
  my_tasks_count?: number;
  my_pending_tasks?: number;
}

interface EarningsRecord {
  amount: number;
}

export async function GET() {
  try {
    const supabase = await createClient();
    // const { searchParams } = new URL(request.url);
    // Note: searchParams is available for future filtering

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is pegawai
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    type UserProfile = { role: "admin" | "ketua_tim" | "pegawai" };
    if (
      profileError ||
      !userProfile ||
      (userProfile as UserProfile).role !== "pegawai"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get projects via RPC first
    const { data: projects, error: projectsError } = await supabase.rpc(
      "get_user_projects",
      { user_id_param: user.id } as never
    );

    let baseProjects: Array<ProjectData> = Array.isArray(projects)
      ? (projects as ProjectData[]) || []
      : [];

    // Fallback: include projects where user is leader or member (in case RPC not populated)
    if (projectsError || baseProjects.length === 0) {
      // As leader
      const { data: leaderProjects } = await supabase
        .from("projects")
        .select(
          "id, nama_project, deskripsi, status, tanggal_mulai, deadline, leader_user_id"
        )
        .eq("leader_user_id", user.id as unknown as string);

      type PMRow = { project_id: string; role: string };
      const { data: memberRows } = await supabase
        .from("project_members")
        .select("project_id, role")
        .eq("user_id", user.id);

      const memberIds = ((memberRows as PMRow[]) || []).map(
        (r) => r.project_id
      );
      const { data: memberProjects } = await supabase
        .from("projects")
        .select(
          "id, nama_project, deskripsi, status, tanggal_mulai, deadline, leader_user_id"
        )
        .in("id", memberIds.length > 0 ? memberIds : ["__none__"]);

      type SimpleProject = {
        id: string;
        nama_project: string;
        deskripsi: string;
        status: string;
        tanggal_mulai: string;
        deadline: string;
        leader_user_id: string;
      };
      const leaderMap = new Set(
        ((leaderProjects as SimpleProject[]) || []).map((p) => p.id)
      );
      const merged = [
        ...(((leaderProjects as SimpleProject[]) || []).map((p) => ({
          project_id: p.id,
          project_name: p.nama_project,
          project_description: p.deskripsi,
          project_status: p.status,
          start_date: p.tanggal_mulai,
          deadline: p.deadline,
          leader_name: "-",
          user_role: "leader",
        })) as ProjectData[]),
        ...(((memberProjects as SimpleProject[]) || [])
          .filter((p) => !leaderMap.has(p.id))
          .map((p) => ({
            project_id: p.id,
            project_name: p.nama_project,
            project_description: p.deskripsi,
            project_status: p.status,
            start_date: p.tanggal_mulai,
            deadline: p.deadline,
            leader_name: "-",
            user_role: "member",
          })) as ProjectData[]),
      ];
      baseProjects = merged;
    }

    // Enrich with additional data
    const enrichedProjects = await Promise.all(
      (baseProjects || []).map(async (project) => {
        // Get my transport earnings for this project
        type TaskIdRow = { id: string };
        const { data: taskIdRows } = await supabase
          .from("tasks")
          .select("id")
          .eq("project_id", project.project_id)
          .eq("assignee_user_id", user.id);

        const taskIds = ((taskIdRows as TaskIdRow[]) || []).map((r) => r.id);

        const { data: earnings } = await supabase
          .from("earnings_ledger")
          .select("amount")
          .eq("user_id", user.id)
          .eq("type", "transport")
          .in("source_id", taskIds.length > 0 ? taskIds : ["__none__"]);

        const totalTransport = (earnings || []).reduce(
          (sum: number, e: EarningsRecord) => sum + e.amount,
          0
        );

        return {
          id: project.project_id,
          nama_project: project.project_name,
          deskripsi: project.project_description,
          status: project.project_status,
          tanggal_mulai: project.start_date,
          deadline: project.deadline,
          user_role: project.user_role,
          ketua_tim: {
            nama_lengkap: project.leader_name,
          },
          team_size: project.team_size,
          my_tasks: {
            total: project.my_tasks_count || 0,
            pending: project.my_pending_tasks || 0,
            completed:
              (project.my_tasks_count || 0) - (project.my_pending_tasks || 0),
          },
          my_transport_earnings: totalTransport,
        };
      })
    );

    return NextResponse.json({
      data: enrichedProjects,
      meta: {
        timestamp: new Date().toISOString(),
        total: enrichedProjects.length,
      },
    });
  } catch (error) {
    console.error("Pegawai Projects API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
