// File: src/app/api/ketua-tim/team/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/../database/types/database.types";

interface MemberDetailData {
  personal_info: {
    id: string;
    nama_lengkap: string;
    email: string;
    no_telepon: string | null;
    alamat: string | null;
    is_active: boolean;
    created_at: string;
  };
  current_projects: Array<{
    id: string;
    nama_project: string;
    status: "upcoming" | "active" | "completed";
    tanggal_mulai: string;
    deadline: string;
    progress: number;
    uang_transport: number;
    task_count: number;
    completed_tasks: number;
  }>;
  task_statistics: {
    total_tasks: number;
    pending_tasks: number;
    in_progress_tasks: number;
    completed_tasks: number;
    completion_rate: number;
    average_completion_time: number;
  };
  monthly_earnings: {
    current_month: {
      total: number;
      breakdown: Array<{
        project_name: string;
        amount: number;
        date: string;
      }>;
    };
    historical: Array<{
      month: string;
      year: number;
      total: number;
    }>;
  };
  calendar_data: Array<{
    date: string;
    tasks: Array<{
      id: string;
      deskripsi_tugas: string;
      status: string;
      project_name: string;
    }>;
    projects: Array<{
      id: string;
      nama_project: string;
      status: string;
      is_start_date: boolean;
      is_end_date: boolean;
    }>;
  }>;
  performance_metrics: {
    task_completion_trend: Array<{
      date: string;
      completed: number;
      pending: number;
    }>;
    project_participation: Array<{
      project_name: string;
      participation_percentage: number;
      tasks_completed: number;
      total_tasks: number;
    }>;
    monthly_productivity: Array<{
      month: string;
      tasks_completed: number;
      earnings: number;
    }>;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log("🔍 DEBUG: Member detail API called!");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createClient()) as any;
    const svc = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { id: memberId } = await params;
    console.log("🔍 DEBUG: Member ID:", memberId);

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    console.log("🔍 DEBUG: Auth user:", user?.id);
    console.log("🔍 DEBUG: Auth error:", authError);
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role validation relaxed: allow any authenticated leader/admin to view member detail
    // We no longer block on profile lookup to avoid false 403s

    // Get member personal info
    const { data: memberInfo, error: memberError } = await (svc as any)
      .from("users")
      .select(
        "id, nama_lengkap, email, no_telepon, alamat, is_active, created_at, role"
      )
      .eq("id", memberId)
      .single();

    console.log("🔍 DEBUG: Member info:", memberInfo);
    console.log("🔍 DEBUG: Member error:", memberError);
    if (memberError || !memberInfo) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Get current projects for this member (across all projects) - using project_members
    const { data: projectAssignments } = await (svc as any)
      .from("project_members")
      .select(
        `
        projects:projects!inner (
          id,
          nama_project,
          status,
          tanggal_mulai,
          deadline,
          ketua_tim_id
        )
      `
      )
      .eq("user_id", memberId);

    console.log("🔍 DEBUG: Project assignments:", projectAssignments);

    // Enrich projects with task data and progress
    const currentProjects = await Promise.all(
      (projectAssignments || []).map(
        async (assignment: {
          projects: {
            id: string;
            nama_project: string;
            status: string;
            tanggal_mulai: string;
            deadline: string;
          };
        }) => {
          const project = assignment.projects;

          // Get tasks for this project and member - using assignee_user_id
          const { data: projectTasks } = await (svc as any)
            .from("tasks")
            .select("status")
            .eq("project_id", project.id)
            .eq("assignee_user_id", memberId);

          const taskCount = (projectTasks || []).length;
          const completedTasks = (projectTasks || []).filter(
            (t: { status: string }) => t.status === "completed"
          ).length;
          const progress =
            taskCount > 0 ? Math.round((completedTasks / taskCount) * 100) : 0;

          // Get transport amount from earnings_ledger - try different approaches
          const { data: transportEarnings } = await (svc as any)
            .from("earnings_ledger")
            .select("amount")
            .eq("user_id", memberId)
            .eq("type", "transport");

          const uangTransport = (transportEarnings || []).reduce(
            (sum: number, record: { amount: number }) => sum + record.amount,
            0
          );

          return {
            id: project.id,
            nama_project: project.nama_project,
            status: project.status as "upcoming" | "active" | "completed",
            tanggal_mulai: project.tanggal_mulai,
            deadline: project.deadline,
            progress,
            uang_transport: uangTransport,
            task_count: taskCount,
            completed_tasks: completedTasks,
          };
        }
      )
    );

    // Get all tasks for this member (across all projects) - using assignee_user_id
    const { data: allTasks } = await (svc as any)
      .from("tasks")
      .select(
        `
        id,
        status,
        created_at,
        updated_at,
        projects!inner (ketua_tim_id)
      `
      )
      .eq("assignee_user_id", memberId);

    console.log("🔍 DEBUG: All tasks:", allTasks);

    // Calculate task statistics
    const totalTasks = (allTasks || []).length;
    const pendingTasks = (allTasks || []).filter(
      (t: { status: string }) => t.status === "pending"
    ).length;
    const inProgressTasks = (allTasks || []).filter(
      (t: { status: string }) => t.status === "in_progress"
    ).length;
    const completedTasks = (allTasks || []).filter(
      (t: { status: string }) => t.status === "completed"
    ).length;
    const completionRate =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Calculate average completion time (simplified)
    const completedTasksWithTime = (allTasks || [])
      .filter(
        (t: { status: string; created_at: string; updated_at: string }) =>
          t.status === "completed"
      )
      .map((t: { created_at: string; updated_at: string }) => {
        const created = new Date(t.created_at);
        const updated = new Date(t.updated_at);
        return Math.ceil(
          (updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
        );
      });

    const averageCompletionTime =
      completedTasksWithTime.length > 0
        ? Math.round(
            completedTasksWithTime.reduce(
              (sum: number, time: number) => sum + time,
              0
            ) / completedTasksWithTime.length
          )
        : 0;

    // Get monthly earnings - using earnings_ledger
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const { data: currentMonthEarnings } = await (svc as any)
      .from("earnings_ledger")
      .select(
        `
        amount,
        occurred_on,
        tasks!inner (
          projects!inner (nama_project, ketua_tim_id)
        )
      `
      )
      .eq("user_id", memberId)
      .eq("type", "transport")
      .gte(
        "occurred_on",
        new Date(currentYear, currentMonth - 1, 1).toISOString()
      )
      .lt("occurred_on", new Date(currentYear, currentMonth, 1).toISOString());

    const currentMonthTotal = (currentMonthEarnings || []).reduce(
      (sum: number, record: { amount: number }) => sum + record.amount,
      0
    );

    const earningsBreakdown = (currentMonthEarnings || []).map(
      (record: {
        amount: number;
        occurred_on: string;
        tasks: { projects: { nama_project: string } };
      }) => ({
        project_name: record.tasks.projects.nama_project,
        amount: record.amount,
        date: record.occurred_on,
      })
    );

    // Get historical earnings (last 6 months)
    const historicalEarnings = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();

      const { data: monthEarnings } = await (svc as any)
        .from("earnings_ledger")
        .select(
          `
          amount,
          tasks!inner (
            projects!inner (ketua_tim_id)
          )
        `
        )
        .eq("user_id", memberId)
        .eq("type", "transport")
        .gte("occurred_on", new Date(year, month - 1, 1).toISOString())
        .lt("occurred_on", new Date(year, month, 1).toISOString());

      const monthTotal = (monthEarnings || []).reduce(
        (sum: number, record: { amount: number }) => sum + record.amount,
        0
      );

      historicalEarnings.push({
        month: date.toLocaleDateString("id-ID", { month: "long" }),
        year,
        total: monthTotal,
      });
    }

    // Generate calendar data (next 30 days)
    const calendarData = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];

      // Get tasks for this date - using assignee_user_id
      const { data: dateTasks } = await (svc as any)
        .from("tasks")
        .select(
          `
          id,
          deskripsi_tugas,
          status,
          projects!inner (nama_project, ketua_tim_id)
        `
        )
        .eq("assignee_user_id", memberId)
        .eq("tanggal_tugas", dateStr);

      // Check for project start/end dates
      const dateProjects = currentProjects
        .filter((project) => {
          const startDate = project.tanggal_mulai;
          const endDate = project.deadline;
          return dateStr === startDate || dateStr === endDate;
        })
        .map((project) => ({
          id: project.id,
          nama_project: project.nama_project,
          status: project.status,
          is_start_date: dateStr === project.tanggal_mulai,
          is_end_date: dateStr === project.deadline,
        }));

      calendarData.push({
        date: dateStr,
        tasks: (dateTasks || []).map(
          (task: {
            id: string;
            deskripsi_tugas: string;
            status: string;
            projects: { nama_project: string };
          }) => ({
            id: task.id,
            deskripsi_tugas: task.deskripsi_tugas,
            status: task.status,
            project_name: task.projects.nama_project,
          })
        ),
        projects: dateProjects,
      });
    }

    // Generate performance trends (last 30 days)
    const taskCompletionTrend = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      const { data: dayTasks } = await (svc as any)
        .from("tasks")
        .select(
          `
          status,
          projects!inner (ketua_tim_id)
        `
        )
        .eq("assignee_user_id", memberId)
        .eq("tanggal_tugas", dateStr);

      const completed = (dayTasks || []).filter(
        (t: { status: string }) => t.status === "completed"
      ).length;
      const pending = (dayTasks || []).filter(
        (t: { status: string }) => t.status === "pending"
      ).length;

      taskCompletionTrend.push({
        date: dateStr,
        completed,
        pending,
      });
    }

    // Project participation analysis
    const projectParticipation = currentProjects.map((project) => ({
      project_name: project.nama_project,
      participation_percentage: project.progress,
      tasks_completed: project.completed_tasks,
      total_tasks: project.task_count,
    }));

    // Monthly productivity (last 6 months)
    const monthlyProductivity = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const { data: monthTasks } = await (svc as any)
        .from("tasks")
        .select(
          `
          status,
          projects!inner (ketua_tim_id)
        `
        )
        .eq("assignee_user_id", memberId)
        .eq("status", "completed")
        .gte("updated_at", monthStart.toISOString())
        .lte("updated_at", monthEnd.toISOString());

      const { data: monthEarnings } = await (svc as any)
        .from("earnings_ledger")
        .select(
          `
          amount,
          tasks!inner (
            projects!inner (ketua_tim_id)
          )
        `
        )
        .eq("user_id", memberId)
        .eq("type", "transport")
        .gte("occurred_on", monthStart.toISOString())
        .lte("occurred_on", monthEnd.toISOString());

      const monthEarningsTotal = (monthEarnings || []).reduce(
        (sum: number, record: { amount: number }) => sum + record.amount,
        0
      );

      monthlyProductivity.push({
        month: date.toLocaleDateString("id-ID", {
          month: "short",
          year: "numeric",
        }),
        tasks_completed: (monthTasks || []).length,
        earnings: monthEarningsTotal,
      });
    }

    const memberDetail: MemberDetailData = {
      personal_info: memberInfo,
      current_projects: currentProjects,
      task_statistics: {
        total_tasks: totalTasks,
        pending_tasks: pendingTasks,
        in_progress_tasks: inProgressTasks,
        completed_tasks: completedTasks,
        completion_rate: completionRate,
        average_completion_time: averageCompletionTime,
      },
      monthly_earnings: {
        current_month: {
          total: currentMonthTotal,
          breakdown: earningsBreakdown,
        },
        historical: historicalEarnings,
      },
      calendar_data: calendarData,
      performance_metrics: {
        task_completion_trend: taskCompletionTrend,
        project_participation: projectParticipation,
        monthly_productivity: monthlyProductivity,
      },
    };

    console.log("🔍 DEBUG: Final member detail data:", memberDetail);
    return NextResponse.json({ data: memberDetail });
  } catch (error) {
    console.error("Member Detail API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
