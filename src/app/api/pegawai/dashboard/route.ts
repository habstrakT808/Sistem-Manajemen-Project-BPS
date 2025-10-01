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
  ids: string[],
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
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Compute stats inline to avoid RPC touching projects policies
    const startOfMonth = new Date();
    startOfMonth.setDate(1);

    const settled = await Promise.allSettled([
      // Use service role for project_members to avoid recursive policy on projects
      // Count assigned projects with team only
      svc
        .from("projects")
        .select("id", { count: "exact", head: true })
        .not("team_id", "is", null)
        .or(`leader_user_id.eq.${user.id},ketua_tim_id.eq.${user.id}`),
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
      // Earnings rows (will be filtered later by allocation->task->project team_id)
      svc
        .from("earnings_ledger")
        .select("amount, occurred_on, source_id")
        .eq("user_id", user.id)
        .gte("occurred_on", startOfMonth.toISOString().split("T")[0]),
      // Get all transport allocations (will be filtered by project team_id)
      svc
        .from("task_transport_allocations")
        .select("id, amount, task_id")
        .eq("user_id", user.id)
        .is("canceled_at", null),
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

    const [
      projectsSet,
      activeTasksSet,
      completedTasksSet,
      earningsSet,
      transportDataSet,
      pendingTransportSet,
      transportRequiredSet,
      transportAllocatedSet,
      pendingReviewsSet,
    ] = settled as any[];

    const assignedProjectsCount =
      projectsSet.status === "fulfilled" ? projectsSet.value.count || 0 : 0;
    const activeTasks =
      activeTasksSet.status === "fulfilled"
        ? activeTasksSet.value.count || 0
        : 0;
    const completedTasks =
      completedTasksSet.status === "fulfilled"
        ? completedTasksSet.value.count || 0
        : 0;
    const monthlyEarningsRows =
      earningsSet.status === "fulfilled" ? earningsSet.value.data || [] : [];
    const transportAllocationsData =
      transportDataSet.status === "fulfilled"
        ? transportDataSet.value.data || []
        : [];
    const pendingTransportCount =
      pendingTransportSet.status === "fulfilled"
        ? pendingTransportSet.value.count || 0
        : 0;
    const transportRequired =
      transportRequiredSet.status === "fulfilled"
        ? transportRequiredSet.value.count || 0
        : 0;
    const transportAllocated =
      transportAllocatedSet.status === "fulfilled"
        ? transportAllocatedSet.value.count || 0
        : 0;
    const pendingReviews =
      pendingReviewsSet.status === "fulfilled"
        ? pendingReviewsSet.value.count || 0
        : 0;

    // Recompute monthly earnings only for allocations whose task.project has a team
    let monthly_earnings = 0;
    if ((monthlyEarningsRows || []).length > 0) {
      const sourceIds = Array.from(
        new Set(
          (monthlyEarningsRows || [])
            .map((r: any) => r?.source_id)
            .filter(Boolean),
        ),
      ) as string[];
      let validAllocIds = new Set<string>();
      if (sourceIds.length > 0) {
        const { data: allocs } = await svc
          .from("task_transport_allocations")
          .select("id, task_id")
          .in("id", sourceIds);
        const taskIds = Array.from(
          new Set((allocs || []).map((a: any) => a.task_id).filter(Boolean)),
        );
        if (taskIds.length > 0) {
          const { data: tasks } = await svc
            .from("tasks")
            .select("id, project_id")
            .in("id", taskIds);
          const projectIds2 = Array.from(
            new Set(
              (tasks || []).map((t: any) => t.project_id).filter(Boolean),
            ),
          );
          if (projectIds2.length > 0) {
            const { data: projectsOk } = await svc
              .from("projects")
              .select("id, team_id")
              .in("id", projectIds2)
              .not("team_id", "is", null);
            const okProjectIds = new Set(
              (projectsOk || []).map((p: any) => p.id),
            );
            (allocs || []).forEach((a: any) => {
              const t = ((tasks as any[]) || []).find(
                (x: any) => x.id === a.task_id,
              ) as any;
              if (t && okProjectIds.has(t.project_id)) validAllocIds.add(a.id);
            });
          }
        }
      }
      monthly_earnings = (monthlyEarningsRows || [])
        .filter((r: any) =>
          r.source_id ? validAllocIds.has(r.source_id) : false,
        )
        .reduce((sum: number, r: any) => sum + (r?.amount || 0), 0);
    }

    // Calculate transport earnings from actual transport allocations
    let transport_earnings = 0;
    if ((transportAllocationsData || []).length > 0) {
      const taskIds = Array.from(
        new Set(
          (transportAllocationsData || [])
            .map((a: any) => a.task_id)
            .filter(Boolean),
        ),
      );
      if (taskIds.length > 0) {
        const { data: tasks } = await svc
          .from("tasks")
          .select("id, project_id")
          .in("id", taskIds);
        const projectIds2 = Array.from(
          new Set((tasks || []).map((t: any) => t.project_id).filter(Boolean)),
        );
        let okProjectIds = new Set<string>();
        if (projectIds2.length > 0) {
          const { data: projectsOk } = await svc
            .from("projects")
            .select("id, team_id")
            .in("id", projectIds2)
            .not("team_id", "is", null);
          okProjectIds = new Set((projectsOk || []).map((p: any) => p.id));
        }
        transport_earnings = (transportAllocationsData || [])
          .filter((a: any) => {
            const t = ((tasks as any[]) || []).find(
              (x: any) => x.id === a.task_id,
            ) as any;
            return t && okProjectIds.has(t.project_id);
          })
          .reduce((sum: number, a: any) => sum + (a?.amount || 0), 0);
      }
    }

    const stats: StatsData = {
      total_tasks: (activeTasks || 0) + (completedTasks || 0),
      completed_tasks: completedTasks || 0,
      pending_tasks: activeTasks || 0,
      total_projects: assignedProjectsCount || 0,
      active_projects: 0,
      completed_projects: 0,
      total_earnings: monthly_earnings,
      transport_earnings: transport_earnings,
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
      `,
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
          .filter(Boolean),
      ),
    ) as string[];

    let projectNameById: Record<string, string> = {};
    if (projectIds.length > 0) {
      projectNameById = await fetchProjectNames(svc, projectIds);
    }

    // Build assigned projects without RPC to avoid RLS recursion
    // 1) Projects where user is leader
    const { data: ownedProjects } = await svc
      .from("projects")
      .select("id, nama_project, status, deadline, leader_user_id, team_id")
      .or(`ketua_tim_id.eq.${user.id},leader_user_id.eq.${user.id}`)
      .not("team_id", "is", null);

    // 2) Projects where user is member
    const { data: memberRows } = await svc
      .from("project_members")
      .select("project_id, role")
      .eq("user_id", user.id);

    const memberProjectIds = Array.from(
      new Set(
        (memberRows || []).map((r) => (r as { project_id: string }).project_id),
      ),
    );

    const { data: memberProjects } = await svc
      .from("projects")
      .select("id, nama_project, status, deadline, leader_user_id, team_id")
      .in("id", memberProjectIds.length > 0 ? memberProjectIds : ["__none__"])
      .not("team_id", "is", null);

    // Merge with role info
    const leaderIds = new Set(
      (ownedProjects || []).map((p) => (p as { id: string }).id),
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
      new Set(allProjects.map((p) => p.leader_user_id).filter(Boolean)),
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

        // Get all allocations for this user (not just the first one)
        const myAllocations = allocList
          .filter((a) => a.user_id === user.id && !a.canceled_at)
          .map((alloc) => ({
            allocation_date: alloc.allocation_date,
            canceled_at: alloc.canceled_at,
          }));

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
          transport_allocations: myAllocations,
        };
      },
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
      { status: 500 },
    );
  }
}
