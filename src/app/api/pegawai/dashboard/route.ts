// File: src/app/api/pegawai/dashboard/route.ts
// UPDATED: Enhanced dashboard with transport allocation tracking

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createClient as createServiceClient,
  SupabaseClient,
} from "@supabase/supabase-js";
import type { Database } from "@/../database/types/database.types";

// Helper to query projects with typed service client
async function fetchProjectNames(
  client: SupabaseClient<Database>,
  ids: string[]
): Promise<Record<string, string>> {
  const { data } = await client
    .from("projects")
    .select("id, nama_project")
    .in("id", ids);
  const map: Record<string, string> = {};
  (data || []).forEach((p) => {
    const row = p as { id: string; nama_project: string };
    map[row.id] = row.nama_project;
  });
  return map;
}

interface StatsData {
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  total_projects: number;
  active_projects: number;
  completed_projects: number;
  total_earnings: number;
  transport_earnings: number;
  pending_transport_allocations?: number;
  transport_required?: number;
  transport_allocated?: number;
  pending_reviews?: number;
}

// Removed unused ProjectData interface

interface TaskData {
  id: string;
  title: string;
  deskripsi_tugas: string;
  start_date: string;
  end_date: string;
  has_transport: boolean;
  status: string;
  response_pegawai: string;
  project_id: string | null;
  task_transport_allocations?: Array<{
    id: string;
    user_id?: string;
    allocation_date: string | null;
    allocated_at: string | null;
    canceled_at: string | null;
  }>;
}

export async function GET() {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Service client to bypass recursive RLS for safe, user-scoped reads
    const svc = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Compute stats inline to avoid RPC touching projects policies
    const startOfMonth = new Date();
    startOfMonth.setDate(1);

    const [
      { count: assignedProjectsCount },
      { count: activeTasks },
      { count: completedTasks },
      { data: monthlyEarningsRows },
      { count: pendingTransportCount },
      { count: transportRequired },
      { count: transportAllocated },
      { count: pendingReviews },
    ] = await Promise.all([
      // Use service role for project_members to avoid recursive policy on projects
      svc
        .from("project_members")
        .select("project_id", { count: "exact", head: true })
        .eq("user_id", user.id),
      // Use service role for tasks as tasks policies may reference projects via FOR ALL
      svc
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("assignee_user_id", user.id)
        .in("status", ["pending", "in_progress"]),
      svc
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("assignee_user_id", user.id)
        .eq("status", "completed"),
      // Use service role for earnings to avoid transitive policy evaluation
      svc
        .from("earnings_ledger")
        .select("amount, occurred_on")
        .eq("user_id", user.id)
        .gte("occurred_on", startOfMonth.toISOString().split("T")[0]),
      // Use service role for transport allocations to avoid policies referencing projects
      svc
        .from("task_transport_allocations")
        .select("id", { count: "exact" })
        .eq("user_id", user.id)
        .is("allocation_date", null)
        .is("canceled_at", null),
      // Transport required (all active allocations)
      svc
        .from("task_transport_allocations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("canceled_at", null),
      // Transport allocated (date selected)
      svc
        .from("task_transport_allocations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .not("allocation_date", "is", null)
        .is("canceled_at", null),
      // Pending reviews for this user
      svc
        .from("mitra_reviews")
        .select("id", { count: "exact", head: true })
        .eq("pegawai_id", user.id)
        .is("rating", null),
    ]);

    const monthly_earnings = (monthlyEarningsRows || []).reduce(
      (sum: number, r: { amount: number }) => sum + (r?.amount || 0),
      0
    );

    const stats: StatsData = {
      total_tasks: (activeTasks || 0) + (completedTasks || 0),
      completed_tasks: completedTasks || 0,
      pending_tasks: activeTasks || 0,
      total_projects: assignedProjectsCount || 0,
      active_projects: 0,
      completed_projects: 0,
      total_earnings: monthly_earnings,
      transport_earnings: monthly_earnings,
      pending_transport_allocations: pendingTransportCount || 0,
      transport_required: transportRequired || 0,
      transport_allocated: transportAllocated || 0,
      pending_reviews: pendingReviews || 0,
    };

    // Get today's and this week's tasks
    const today = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(today.getDate() + 7);

    // Note: avoid join on projects because there is no FK in schema cache
    const { data: todayTasks, error: tasksError } = await svc
      .from("tasks")
      .select(
        `
        id,
        title,
        deskripsi_tugas,
        start_date,
        end_date,
        has_transport,
        status,
        response_pegawai,
        project_id,
        task_transport_allocations (
          id,
          user_id,
          allocation_date,
          canceled_at
        )
      `
      )
      .eq("assignee_user_id", user.id)
      .lte("start_date", weekFromNow.toISOString().split("T")[0])
      .gte("end_date", today.toISOString().split("T")[0])
      .order("start_date", { ascending: true });

    if (tasksError) {
      throw tasksError;
    }

    // Fetch project names with service client to avoid recursive RLS
    const projectIds = Array.from(
      new Set(
        ((todayTasks as TaskData[]) || [])
          .map((t) => t.project_id)
          .filter(Boolean)
      )
    ) as string[];

    let projectNameById: Record<string, string> = {};
    if (projectIds.length > 0) {
      projectNameById = await fetchProjectNames(svc, projectIds);
    }

    // Build assigned projects without RPC to avoid RLS recursion
    // 1) Projects where user is leader
    const { data: ownedProjects } = await svc
      .from("projects")
      .select("id, nama_project, status, deadline, leader_user_id")
      .or(`ketua_tim_id.eq.${user.id},leader_user_id.eq.${user.id}`);

    // 2) Projects where user is member
    const { data: memberRows } = await svc
      .from("project_members")
      .select("project_id, role")
      .eq("user_id", user.id);

    const memberProjectIds = Array.from(
      new Set(
        (memberRows || []).map((r) => (r as { project_id: string }).project_id)
      )
    );

    const { data: memberProjects } = await svc
      .from("projects")
      .select("id, nama_project, status, deadline, leader_user_id")
      .in("id", memberProjectIds.length > 0 ? memberProjectIds : ["__none__"]);

    // Merge with role info
    const leaderIds = new Set(
      (ownedProjects || []).map((p) => (p as { id: string }).id)
    );
    const allProjects = [
      ...((ownedProjects || []).map((p) => ({
        ...(p as {
          id: string;
          nama_project: string;
          status: string;
          deadline: string;
          leader_user_id: string | null;
        }),
        user_role: "leader" as const,
      })) as Array<{
        id: string;
        nama_project: string;
        status: string;
        deadline: string;
        leader_user_id: string | null;
        user_role: "leader";
      }>),
      ...((memberProjects || [])
        .filter((p) => !leaderIds.has((p as { id: string }).id))
        .map((p) => ({
          ...(p as {
            id: string;
            nama_project: string;
            status: string;
            deadline: string;
            leader_user_id: string | null;
          }),
          user_role: "member" as const,
        })) as Array<{
        id: string;
        nama_project: string;
        status: string;
        deadline: string;
        leader_user_id: string | null;
        user_role: "member";
      }>),
    ];

    // Map leader names
    const leaderUserIds = Array.from(
      new Set(allProjects.map((p) => p.leader_user_id).filter(Boolean))
    ) as string[];
    const leaderNameById: Record<string, string> = {};
    if (leaderUserIds.length > 0) {
      const { data: leaders } = await svc
        .from("users")
        .select("id, nama_lengkap")
        .in("id", leaderUserIds);
      (leaders || []).forEach((u) => {
        const row = u as { id: string; nama_lengkap: string };
        leaderNameById[row.id] = row.nama_lengkap;
      });
    }

    // Task counts for this user per project
    const projectIdsForCounts = allProjects.map((p) => p.id);
    const myPendingByProject: Record<string, number> = {};
    const myTotalByProject: Record<string, number> = {};
    if (projectIdsForCounts.length > 0) {
      const { data: myTasks } = await svc
        .from("tasks")
        .select("project_id, status")
        .eq("assignee_user_id", user.id)
        .in("project_id", projectIdsForCounts);
      (myTasks || []).forEach((t) => {
        const row = t as { project_id: string; status: string };
        myTotalByProject[row.project_id] =
          (myTotalByProject[row.project_id] || 0) + 1;
        if (row.status === "pending" || row.status === "in_progress") {
          myPendingByProject[row.project_id] =
            (myPendingByProject[row.project_id] || 0) + 1;
        }
      });
    }

    const assignedProjects = allProjects.map((row) => {
      const total = myTotalByProject[row.id] || 0;
      const pending = myPendingByProject[row.id] || 0;
      return {
        id: row.id,
        nama_project: row.nama_project,
        status: row.status,
        deadline: row.deadline,
        ketua_tim_name: row.leader_user_id
          ? leaderNameById[row.leader_user_id] || "-"
          : "-",
        user_role: row.user_role,
        my_progress:
          total > 0 ? Math.round(((total - pending) / total) * 100) : 0,
      };
    });

    // Format today's tasks
    const formattedTasks = ((todayTasks as TaskData[]) || []).map(
      (task: TaskData) => {
        const rawAlloc = (
          task as unknown as {
            task_transport_allocations?: unknown;
          }
        ).task_transport_allocations;

        const allocList: Array<{
          user_id?: string;
          allocation_date?: string | null;
          canceled_at?: string | null;
        }> = Array.isArray(rawAlloc)
          ? (rawAlloc as Array<{
              user_id?: string;
              allocation_date?: string | null;
              canceled_at?: string | null;
            }>)
          : rawAlloc
            ? [
                rawAlloc as {
                  user_id?: string;
                  allocation_date?: string | null;
                  canceled_at?: string | null;
                },
              ]
            : [];

        const myAlloc = allocList.find(
          (a) => a.user_id === user.id && !a.canceled_at
        ) as
          | { allocation_date: string | null; canceled_at: string | null }
          | undefined;

        return {
          id: task.id,
          title: task.title,
          deskripsi_tugas: task.deskripsi_tugas,
          start_date: task.start_date,
          end_date: task.end_date,
          has_transport: task.has_transport,
          status: task.status,
          response_pegawai: task.response_pegawai,
          project_name: task.project_id
            ? projectNameById[task.project_id] || "-"
            : "-",
          transport_allocation: myAlloc
            ? {
                allocation_date: myAlloc.allocation_date,
                canceled_at: myAlloc.canceled_at,
              }
            : null,
        };
      }
    );

    return NextResponse.json({
      stats,
      today_tasks: formattedTasks,
      assigned_projects: assignedProjects,
    });
  } catch (error) {
    console.error("Pegawai Dashboard API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
