// File: src/app/api/ketua-tim/dashboard/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/../database/types/database.types";

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

    // Use service client and enforce ownership manually to avoid RLS recursion
    const svc = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Compute stats directly for consistency with projects endpoint
    const [{ count: allProjectsCount }, { count: activeProjectsCount }] =
      await Promise.all([
        (svc as any)
          .from("projects")
          .select("id", { count: "exact", head: true })
          .eq("ketua_tim_id", user.id),
        (svc as any)
          .from("projects")
          .select("id", { count: "exact", head: true })
          .eq("ketua_tim_id", user.id)
          .eq("status", "active"),
      ]);

    // Team members: distinct user_ids in project_members for user's projects
    const { data: memberRows } = await (svc as any)
      .from("project_members")
      .select("user_id, project_id")
      .in(
        "project_id",
        (
          await (svc as any)
            .from("projects")
            .select("id")
            .eq("ketua_tim_id", user.id)
        ).data?.map((p: { id: string }) => p.id) || [],
      );
    const uniqueMemberIds = new Set<string>(
      (memberRows || []).map((m: any) => m.user_id),
    );

    // Pending tasks within next 7 days for user's projects
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const { count: pendingTasksCount } = await (svc as any)
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .in(
        "project_id",
        (
          await (svc as any)
            .from("projects")
            .select("id")
            .eq("ketua_tim_id", user.id)
        ).data?.map((p: { id: string }) => p.id) || [],
      )
      .eq("status", "pending")
      .lte("tanggal_tugas", sevenDaysFromNow);

    // Monthly budget: transport (earnings_ledger via allocation source) + mitra honor (financial_records)
    const now = new Date();
    const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));
    const ymStart = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-01`;
    const nextMonth = now.getMonth() === 11 ? 1 : now.getMonth() + 2;
    const nextYear =
      now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
    const ymEndExclusive = `${nextYear}-${pad2(nextMonth)}-01`;

    // Owned project ids (reuse computed above)
    const ownedProjectIds =
      (
        await (svc as any)
          .from("projects")
          .select("id")
          .eq("ketua_tim_id", user.id)
      ).data?.map((p: { id: string }) => p.id) || [];

    // Tasks in owned projects
    const { data: ownedTasks } = await (svc as any)
      .from("tasks")
      .select("id")
      .in("project_id", ownedProjectIds);
    const taskIds = (ownedTasks || []).map((t: { id: string }) => t.id);

    // Allocations for those tasks in current month
    const { data: allocs } = taskIds.length
      ? await (svc as any)
          .from("task_transport_allocations")
          .select("id")
          .in("task_id", taskIds)
          .gte("allocation_date", ymStart)
          .lt("allocation_date", ymEndExclusive)
          .is("canceled_at", null)
      : { data: [] };
    const allocationIds = (allocs || []).map((a: { id: string }) => a.id);

    // Sum earnings_ledger for those allocations (transport)
    const { data: transportLedger } = allocationIds.length
      ? await (svc as any)
          .from("earnings_ledger")
          .select("amount")
          .eq("type", "transport")
          .in("source_id", allocationIds)
          .gte("occurred_on", ymStart)
          .lt("occurred_on", ymEndExclusive)
      : { data: [] };
    const transportTotal = (transportLedger || []).reduce(
      (sum: number, r: { amount: number }) => sum + r.amount,
      0,
    );

    // Sum mitra honor from financial_records for owned projects and current month
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const { data: mitraRows } = ownedProjectIds.length
      ? await (svc as any)
          .from("financial_records")
          .select("amount, project_id, bulan, tahun, type")
          .in("project_id", ownedProjectIds)
          .eq("bulan", currentMonth)
          .eq("tahun", currentYear)
          .eq("type", "mitra_honor")
      : { data: [] };
    const mitraTotal = (mitraRows || []).reduce(
      (sum: number, r: { amount: number }) => sum + r.amount,
      0,
    );

    // Alternatively, to match Financial Monthly Spending card semantics,
    // use current project assignments (transport + honor) as the month budget view
    const { data: currentAssignments } = ownedProjectIds.length
      ? await (svc as any)
          .from("project_assignments")
          .select("project_id, uang_transport, honor")
          .in("project_id", ownedProjectIds)
      : { data: [] };
    const totalSpendingFromAssignments = (currentAssignments || []).reduce(
      (
        sum: number,
        a: { uang_transport: number | null; honor: number | null },
      ) => sum + (a.uang_transport || 0) + (a.honor || 0),
      0,
    );

    const monthlyBudget =
      totalSpendingFromAssignments > 0
        ? totalSpendingFromAssignments
        : transportTotal + mitraTotal;

    const stats: DashboardStats = {
      my_projects: allProjectsCount || 0,
      active_projects: activeProjectsCount || 0,
      team_members: uniqueMemberIds.size || 0,
      pending_tasks: pendingTasksCount || 0,
      monthly_budget: monthlyBudget || 0,
    };

    // Get recent projects (last 5)
    const { data: recentProjects } = await (svc as any)
      .from("projects")
      .select(
        `
        id,
        nama_project,
        status,
        deadline,
        created_at
      `,
      )
      .eq("ketua_tim_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    const { data: pendingTasks } = await (svc as any)
      .from("tasks")
      .select(
        `
        id,
        deskripsi_tugas,
        tanggal_tugas,
        status,
        users:users!inner (nama_lengkap),
        projects:projects!inner (nama_project, ketua_tim_id)
      `,
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
          // Get team size from project_members
          const { data: members } = await (svc as any)
            .from("project_members")
            .select("id")
            .eq("project_id", project.id);

          const team_size = (members || []).length;

          // Calculate progress based on completed tasks vs total tasks
          const { data: allTasks } = await (svc as any)
            .from("tasks")
            .select("status")
            .eq("project_id", project.id);

          let progress = 0;
          if (allTasks && allTasks.length > 0) {
            const completedTasks = allTasks.filter(
              (task: { status: string }) => task.status === "completed",
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
        },
      ),
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
      }),
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
      { status: 500 },
    );
  }
}
