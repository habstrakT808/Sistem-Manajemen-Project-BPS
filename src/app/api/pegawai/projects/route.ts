// File: src/app/api/pegawai/projects/route.ts
// NEW: Pegawai project listing (landing page after login)

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/../database/types/database.types";

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

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("team_id");
    console.log("[API] /api/pegawai/projects - teamId:", teamId);
    const svc = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

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

    // If teamId is provided, fetch projects in that team directly, including both leader and member roles
    if (teamId) {
      // 1) All projects under the team
      const { data: teamProjects } = await (svc as any)
        .from("projects")
        .select(
          "id, nama_project, deskripsi, status, tanggal_mulai, deadline, leader_user_id, team_id",
        )
        .eq("team_id", teamId);

      // 2) Membership rows for current user within these projects (only as member, not leader)
      const projectIds = (teamProjects || []).map((p: any) => p.id);
      const { data: memberRows } = await (svc as any)
        .from("project_members")
        .select("project_id, role")
        .eq("user_id", user.id)
        .eq("role", "member")
        .in("project_id", projectIds.length > 0 ? projectIds : ["__none__"]);

      const memberSet = new Set(
        (memberRows || []).map((r: any) => r.project_id),
      );

      // 3) Fallback membership via tasks assigned to the user (assignee_user_id or legacy pegawai_id)
      if (projectIds.length > 0) {
        const { data: taskProjects } = await (svc as any)
          .from("tasks")
          .select("project_id")
          .in("project_id", projectIds)
          .or(`assignee_user_id.eq.${user.id},pegawai_id.eq.${user.id}`);

        (taskProjects || []).forEach((r: any) => {
          if (r?.project_id) memberSet.add(r.project_id);
        });
      }

      // 4) No longer include leader projects automatically
      // Projects are only shown if user is explicitly assigned as a member
      let extraMemberProjects: any[] = [];

      // 5) Also include projects where current user is a member but project.team_id is null
      const { data: memberProjectsNoTeam } = await (svc as any)
        .from("projects")
        .select(
          "id, nama_project, deskripsi, status, tanggal_mulai, deadline, leader_user_id, team_id",
        )
        .is("team_id", null)
        .in("id", projectIds.length > 0 ? projectIds : ["__none__"]);
      // Note: above would be empty; instead fetch by membership table directly (only as member, not leader)
      const { data: memberDirect } = await (svc as any)
        .from("project_members")
        .select("project_id")
        .eq("user_id", user.id)
        .eq("role", "member");
      const memberProjectIdsNoTeam = (memberDirect || []).map(
        (r: any) => r.project_id,
      );
      memberProjectIdsNoTeam.forEach((pid: string) => memberSet.add(pid));
      const { data: memberProjectsFetched } = await (svc as any)
        .from("projects")
        .select(
          "id, nama_project, deskripsi, status, tanggal_mulai, deadline, leader_user_id, team_id",
        )
        .is("team_id", null)
        .in(
          "id",
          memberProjectIdsNoTeam.length > 0
            ? memberProjectIdsNoTeam
            : ["__none__"],
        );
      extraMemberProjects = memberProjectsFetched || [];

      // 6) Treat project_assignments(assignee_type='pegawai', assignee_id=user.id) as membership for no-team projects
      const { data: assignmentProjectIdsRows } = await (svc as any)
        .from("project_assignments")
        .select("project_id")
        .eq("assignee_type", "pegawai")
        .eq("assignee_id", user.id);
      const assignmentProjectIds = (assignmentProjectIdsRows || []).map(
        (r: any) => r.project_id,
      );
      if (assignmentProjectIds.length > 0) {
        // Mark membership via assignments
        assignmentProjectIds.forEach((pid: string) => memberSet.add(pid));
        const { data: assignmentProjectsNoTeam } = await (svc as any)
          .from("projects")
          .select(
            "id, nama_project, deskripsi, status, tanggal_mulai, deadline, leader_user_id, team_id",
          )
          .is("team_id", null)
          .in("id", assignmentProjectIds);
        if (assignmentProjectsNoTeam && assignmentProjectsNoTeam.length > 0) {
          extraMemberProjects = [
            ...extraMemberProjects,
            ...assignmentProjectsNoTeam,
          ];
        }
      }

      // Merge: team projects + member no-team projects (no leader projects)
      const mergedProjectsMap: Record<string, any> = {};
      [...(teamProjects || []), ...extraMemberProjects].forEach((p: any) => {
        mergedProjectsMap[p.id] = p;
      });
      const mergedProjects = Object.values(mergedProjectsMap);

      // Filter to only show projects where user is actually assigned as a member
      // User is assigned if:
      // 1. Has project_members entry (memberSet)
      // 2. Has tasks assigned
      // Note: Being a project leader does NOT automatically make you a member in pegawai view
      // AND project belongs to the selected team
      const filteredProjects = (mergedProjects as any[]).filter((p: any) => {
        // Check if user is assigned to this project (only as member, not as leader)
        const isInMemberSet = memberSet.has(p.id);

        // Check if project belongs to the selected team
        const belongsToTeam = p.team_id === teamId;

        console.log(
          `[API] Project ${p.id} (${p.nama_project}): isInMemberSet=${isInMemberSet}, belongsToTeam=${belongsToTeam}, team_id=${p.team_id}, expected_team_id=${teamId}`,
        );

        return isInMemberSet && belongsToTeam;
      });

      console.log(
        `[API] Total merged projects: ${mergedProjects.length}, filtered projects: ${filteredProjects.length}`,
      );

      let baseProjects: Array<ProjectData> = filteredProjects.map((p: any) => ({
        project_id: p.id,
        project_name: p.nama_project,
        project_description: p.deskripsi,
        project_status: p.status,
        status: p.status,
        start_date: p.tanggal_mulai,
        end_date: p.deadline,
        deadline: p.deadline,
        leader_name: "-",
        // In pegawai view, user is always a member (since we filter by memberSet)
        user_role: "member" as const,
        team_size: undefined,
        my_tasks_count: undefined,
        my_pending_tasks: undefined,
      }));

      // Only show projects where user is actually assigned

      // Enrich and return
      const enrichedProjects = await Promise.all(
        (baseProjects || []).map(async (project) => {
          // Get all tasks assigned to user (including pegawai_id for backward compatibility)
          type TaskRow = { id: string; status: string };
          const { data: userTasks } = await (svc as any)
            .from("tasks")
            .select("id, status")
            .eq("project_id", project.project_id)
            .or(`assignee_user_id.eq.${user.id},pegawai_id.eq.${user.id}`);

          const tasks = (userTasks as TaskRow[]) || [];
          const totalTasks = tasks.length;
          const completedTasks = tasks.filter(
            (t) => t.status === "completed",
          ).length;
          const pendingTasks = tasks.filter(
            (t) => t.status === "pending",
          ).length;

          // Get transport earnings from task_transport_allocations
          const taskIds = tasks.map((t) => t.id);
          const { data: transportData } = await (svc as any)
            .from("task_transport_allocations")
            .select("amount")
            .eq("user_id", user.id)
            .in("task_id", taskIds.length > 0 ? taskIds : ["__none__"]);

          const totalTransport = (transportData || []).reduce(
            (sum: number, t: any) => sum + (Number(t.amount) || 0),
            0,
          );

          return {
            id: project.project_id,
            nama_project: project.project_name,
            deskripsi: project.project_description,
            status: project.project_status,
            tanggal_mulai: project.start_date,
            deadline: project.deadline,
            user_role: (project as any).user_role || "member",
            ketua_tim: { nama_lengkap: project.leader_name },
            team_size: project.team_size,
            my_tasks: {
              total: totalTasks,
              pending: pendingTasks,
              completed: completedTasks,
            },
            my_transport_earnings: totalTransport,
          };
        }),
      );

      return NextResponse.json({
        data: enrichedProjects,
        meta: {
          timestamp: new Date().toISOString(),
          total: enrichedProjects.length,
        },
      });
    }

    // Get projects via RPC first (unfiltered)
    const { data: projects, error: projectsError } = await supabase.rpc(
      "get_user_projects",
      { user_id_param: user.id } as never,
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
          "id, nama_project, deskripsi, status, tanggal_mulai, deadline, leader_user_id",
        )
        .eq("leader_user_id", user.id as unknown as string);

      type PMRow = { project_id: string; role: string };
      const { data: memberRows } = await supabase
        .from("project_members")
        .select("project_id, role")
        .eq("user_id", user.id);

      const memberIds = ((memberRows as PMRow[]) || []).map(
        (r) => r.project_id,
      );
      const { data: memberProjects } = await supabase
        .from("projects")
        .select(
          "id, nama_project, deskripsi, status, tanggal_mulai, deadline, leader_user_id",
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
        ((leaderProjects as SimpleProject[]) || []).map((p) => p.id),
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

    // If no teamId, continue with user-scoped projects as before

    // Enrich with additional data
    const enrichedProjects = await Promise.all(
      (baseProjects || []).map(async (project) => {
        // Get my transport earnings for this project
        // First get task IDs for this project where user is assigned
        type TaskIdRow = { id: string };
        const { data: taskIdRows } = await supabase
          .from("tasks")
          .select("id")
          .eq("project_id", project.project_id)
          .eq("assignee_user_id", user.id);

        const taskIds = ((taskIdRows as TaskIdRow[]) || []).map((r) => r.id);

        // Get transport allocations for these tasks that have been allocated
        let allocationIds: string[] = [];
        if (taskIds.length > 0) {
          const { data: allocationRows } = await supabase
            .from("task_transport_allocations")
            .select("id")
            .eq("user_id", user.id)
            .in("task_id", taskIds)
            .not("allocation_date", "is", null)
            .is("canceled_at", null);

          allocationIds = ((allocationRows as { id: string }[]) || []).map(
            (r) => r.id,
          );
        }

        // Get earnings only for allocated transport allocations
        const { data: earnings } = await supabase
          .from("earnings_ledger")
          .select("amount")
          .eq("user_id", user.id)
          .eq("type", "transport")
          .eq("source_table", "task_transport_allocations")
          .in(
            "source_id",
            allocationIds.length > 0 ? allocationIds : ["__none__"],
          );

        const totalTransport = (earnings || []).reduce(
          (sum: number, e: EarningsRecord) => sum + e.amount,
          0,
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
      }),
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
      { status: 500 },
    );
  }
}
