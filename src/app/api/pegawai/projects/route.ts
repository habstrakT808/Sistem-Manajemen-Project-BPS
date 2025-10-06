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

      // 2) Membership rows for current user within these projects
      const projectIds = (teamProjects || []).map((p: any) => p.id);
      const { data: memberRows } = await (svc as any)
        .from("project_members")
        .select("project_id, role")
        .eq("user_id", user.id)
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

      // 4) If current user is the leader of this team, include user's leader projects even when team_id is null
      const { data: teamRow } = await (svc as any)
        .from("teams")
        .select("leader_user_id")
        .eq("id", teamId)
        .single();

      let extraLeaderProjects: any[] = [];
      let extraMemberProjects: any[] = [];

      if (teamRow) {
        const leaderId = (teamRow as any).leader_user_id as string;
        const { data: leaderProjectsNoTeam } = await (svc as any)
          .from("projects")
          .select(
            "id, nama_project, deskripsi, status, tanggal_mulai, deadline, leader_user_id, team_id, ketua_tim_id",
          )
          .is("team_id", null)
          .or(`leader_user_id.eq.${leaderId},ketua_tim_id.eq.${leaderId}`);
        extraLeaderProjects = leaderProjectsNoTeam || [];
      }

      // 5) Also include projects where current user is a member but project.team_id is null
      const { data: memberProjectsNoTeam } = await (svc as any)
        .from("projects")
        .select(
          "id, nama_project, deskripsi, status, tanggal_mulai, deadline, leader_user_id, team_id",
        )
        .is("team_id", null)
        .in("id", projectIds.length > 0 ? projectIds : ["__none__"]);
      // Note: above would be empty; instead fetch by membership table directly
      const { data: memberDirect } = await (svc as any)
        .from("project_members")
        .select("project_id")
        .eq("user_id", user.id);
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

      // Merge: team projects + leader no-team projects + member no-team projects
      const mergedProjectsMap: Record<string, any> = {};
      [
        ...(teamProjects || []),
        ...extraLeaderProjects,
        ...extraMemberProjects,
      ].forEach((p: any) => {
        mergedProjectsMap[p.id] = p;
      });
      const mergedProjects = Object.values(mergedProjectsMap);

      let baseProjects: Array<ProjectData> = (mergedProjects as any[]).map(
        (p: any) => ({
          project_id: p.id,
          project_name: p.nama_project,
          project_description: p.deskripsi,
          project_status: p.status,
          status: p.status,
          start_date: p.tanggal_mulai,
          end_date: p.deadline,
          deadline: p.deadline,
          leader_name: "-",
          // Treat explicit membership as "member" even if user is also leader,
          // so the project appears on the Pegawai list view.
          user_role: memberSet.has(p.id)
            ? ("member" as const)
            : p.leader_user_id === user.id || p.ketua_tim_id === user.id
              ? ("leader" as const)
              : ("member" as const),
          team_size: undefined,
          my_tasks_count: undefined,
          my_pending_tasks: undefined,
        }),
      );

      // Do not filter by relation; show all projects under the team (default as member)

      // Enrich and return
      const enrichedProjects = await Promise.all(
        (baseProjects || []).map(async (project) => {
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
            (sum: number, e: any) => sum + e.amount,
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
