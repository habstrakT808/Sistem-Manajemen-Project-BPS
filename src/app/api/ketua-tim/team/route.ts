// File: src/app/api/ketua-tim/team/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/../database/types/database.types";

interface TeamMemberData {
  id: string;
  nama_lengkap: string;
  email: string;
  is_active: boolean;
  workload: {
    project_count: number;
    workload_level: "low" | "medium" | "high";
  };
  current_projects: Array<{
    id: string;
    nama_project: string;
    status: string;
    deadline: string;
  }>;
  task_stats: {
    pending: number;
    in_progress: number;
    completed: number;
    total: number;
  };
  monthly_earnings: number;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = (await createClient()) as any;
    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get("include_stats") === "true";

    // Check if user is ketua tim
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use service client to avoid RLS recursion and select only members of leader's projects
    const svc = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Authorization + scope: gather IDs of projects owned by this user
    const { data: ownedProjects } = await (svc as any)
      .from("projects")
      .select("id")
      .or(`ketua_tim_id.eq.${user.id},leader_user_id.eq.${user.id}`);
    const ownedProjectIds: string[] = (ownedProjects || []).map(
      (p: any) => p.id,
    );

    if (!ownedProjectIds.length) {
      return NextResponse.json(
        {
          error: "Forbidden",
          details: "User must own at least one project to view team members",
        },
        { status: 403 },
      );
    }

    // Pegawai yang tergabung di project yang dipimpin user
    const { data: memberRows, error: memberErr } = await svc
      .from("project_members")
      .select(
        `user_id, project_id, users:users!project_members_user_id_fkey(id, nama_lengkap, email, is_active)`,
      )
      .in("project_id", ownedProjectIds);

    if (memberErr) throw memberErr;

    // Remove duplicates and filter active users
    const uniqueUsers = new Map();
    (memberRows || []).forEach(
      (r: { users: { id: string; is_active: boolean } }) => {
        if (r.users && r.users.is_active && !uniqueUsers.has(r.users.id)) {
          uniqueUsers.set(r.users.id, r.users);
        }
      },
    );
    const pegawai = Array.from(uniqueUsers.values());

    // If no pegawai found, return empty array
    if (pegawai.length === 0) {
      return NextResponse.json({
        data: [],
        message: "No team members found",
      });
    }

    if (!includeStats) {
      return NextResponse.json({ data: pegawai || [] });
    }

    // Enrich with detailed stats
    const enrichedTeamMembers = await Promise.all(
      (pegawai || []).map(
        async (member: {
          id: string;
          nama_lengkap: string;
          email: string;
          is_active: boolean;
        }): Promise<TeamMemberData> => {
          try {
            // Get workload data - calculate manually since get_pegawai_workload uses old schema
            const { data: memberProjects } = await svc
              .from("project_members")
              .select(
                `
                projects:projects!inner (
                  id,
                  status,
                  tanggal_mulai,
                  deadline
                )
              `,
              )
              .eq("user_id", member.id)
              .in("projects.status", ["upcoming", "active"]);

            const projectCount = (memberProjects || []).length;
            const workloadLevel =
              projectCount <= 2 ? "low" : projectCount <= 4 ? "medium" : "high";

            // Get current projects for this pegawai from ketua tim's projects
            const { data: projectAssignments } = await svc
              .from("project_members")
              .select(
                `
                projects:projects!inner (
                  id,
                  nama_project,
                  status,
                  deadline,
                  ketua_tim_id,
                  leader_user_id
                )
              `,
              )
              .eq("user_id", member.id)
              .in("projects.id", ownedProjectIds)
              .in("projects.status", ["upcoming", "active"]);

            const currentProjects = (projectAssignments || []).map(
              (assignment: {
                projects: {
                  id: string;
                  nama_project: string;
                  status: string;
                  deadline: string;
                };
              }) => assignment.projects,
            );

            // Get task statistics - tasks assigned to this member (support legacy pegawai_id)
            const { data: allTasks } = await (svc as any)
              .from("tasks")
              .select(`id, status, project_id, assignee_user_id, pegawai_id`)
              .in("project_id", ownedProjectIds)
              .or(
                `assignee_user_id.eq.${member.id},pegawai_id.eq.${member.id}`,
              );

            const filteredTasks = allTasks || [];
            const taskStats = {
              pending: filteredTasks.filter(
                (t: { status: string }) => t.status === "pending",
              ).length,
              in_progress: filteredTasks.filter(
                (t: { status: string }) => t.status === "in_progress",
              ).length,
              completed: filteredTasks.filter(
                (t: { status: string }) => t.status === "completed",
              ).length,
              total: filteredTasks.length,
            };

            // Get monthly transport earnings scoped to leader's projects via allocations
            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();

            const monthStart = new Date(currentYear, currentMonth - 1, 1)
              .toISOString()
              .split("T")[0];
            const nextMonthStart = new Date(currentYear, currentMonth, 1)
              .toISOString()
              .split("T")[0];

            const { data: allocationRows } = await (svc as any)
              .from("task_transport_allocations")
              .select(`amount, allocation_date, task:tasks!inner(project_id)`)
              .eq("user_id", member.id)
              .in("task.project_id", ownedProjectIds)
              .gte("allocation_date", monthStart)
              .lt("allocation_date", nextMonthStart);

            const monthlyEarnings = (allocationRows || []).reduce(
              (sum: number, r: { amount: number }) => sum + (r?.amount || 0),
              0,
            );

            return {
              ...member,
              workload: {
                project_count: projectCount,
                workload_level: workloadLevel as "low" | "medium" | "high",
              },
              current_projects: currentProjects,
              task_stats: taskStats,
              monthly_earnings: monthlyEarnings,
            };
          } catch (error) {
            console.error(
              `Error getting stats for member ${member.id}:`,
              error,
            );
            return {
              ...member,
              workload: { project_count: 0, workload_level: "low" },
              current_projects: [],
              task_stats: {
                pending: 0,
                in_progress: 0,
                completed: 0,
                total: 0,
              },
              monthly_earnings: 0,
            };
          }
        },
      ),
    );

    return NextResponse.json({ data: enrichedTeamMembers });
  } catch (error) {
    console.error("Team data fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
