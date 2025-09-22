// File: src/app/api/ketua-tim/team/analytics/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/../database/types/database.types";

export async function GET(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createClient()) as any;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "30"; // days

    // Check if user is ketua tim
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use service client to avoid RLS recursion issues
    const svc = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Remove hard role gate; we'll rely on project ownership checks below

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Get team performance metrics

    // Get all tasks for projects led by this ketua tim
    const { data: projects } = await (svc as any)
      .from("projects")
      .select("id")
      .or(`ketua_tim_id.eq.${user.id},leader_user_id.eq.${user.id}`);

    const projectIds = (projects || []).map((p: any) => p.id);

    const { data: teamTasks } = await (svc as any)
      .from("tasks")
      .select(
        `
        status,
        created_at,
        updated_at,
        assignee_user_id,
        pegawai_id,
        project_id
      `
      )
      .in("project_id", projectIds);

    // Get team members from projects led by this ketua tim
    const { data: teamMemberRows } = await (svc as any)
      .from("project_members")
      .select("user_id, project_id")
      .in("project_id", projectIds);

    // Build distinct user ids from project_members and tasks (fallback)
    const memberIdSet = new Set<string>(
      (teamMemberRows || [])
        .map((r: { user_id: string | null }) => r.user_id)
        .filter(Boolean) as string[]
    );
    // Add from tasks assignees in owned projects as a safety net
    for (const t of teamTasks || []) {
      const a = (t as any).assignee_user_id || (t as any).pegawai_id;
      if (a) memberIdSet.add(a as string);
    }

    const distinctUserIds = Array.from(memberIdSet);

    const { data: usersRows } = distinctUserIds.length
      ? await (svc as any)
          .from("users")
          .select("id, nama_lengkap")
          .in("id", distinctUserIds)
      : { data: [] };

    const allPegawai = (usersRows || []).map((u: any) => ({
      id: u.id,
      nama_lengkap: u.nama_lengkap,
    }));

    const workloadDistribution = await Promise.all(
      (allPegawai || []).map(
        async (pegawai: { id: string; nama_lengkap: string }) => {
          // Calculate workload manually since get_pegawai_workload uses old schema
          const { data: memberProjects } = await (svc as any)
            .from("project_members")
            .select(
              `
              projects:projects!inner (
                id,
                status
              )
            `
            )
            .eq("user_id", pegawai.id)
            .in("projects.status", ["upcoming", "active"]);

          const projectCount = (memberProjects || []).length;
          const workloadLevel =
            projectCount <= 2 ? "low" : projectCount <= 4 ? "medium" : "high";

          return {
            pegawai_id: pegawai.id,
            nama_lengkap: pegawai.nama_lengkap,
            project_count: projectCount,
            workload_level: workloadLevel,
          };
        }
      )
    );

    // Calculate task completion trends (last 30 days)
    const taskTrends = [];
    for (let i = parseInt(period); i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      const dayTasks = (teamTasks || []).filter(
        (task: { updated_at: string; status: string }) => {
          const taskDate = new Date(task.updated_at)
            .toISOString()
            .split("T")[0];
          return taskDate === dateStr;
        }
      );

      taskTrends.push({
        date: dateStr,
        completed: dayTasks.filter(
          (t: { status: string }) => t.status === "completed"
        ).length,
        in_progress: dayTasks.filter(
          (t: { status: string }) => t.status === "in_progress"
        ).length,
        pending: dayTasks.filter(
          (t: { status: string }) => t.status === "pending"
        ).length,
        total: dayTasks.length,
      });
    }

    // Calculate team member performance
    const memberPerformance = (allPegawai || []).map(
      (pegawai: { id: string; nama_lengkap: string }) => {
        const memberTasks = (teamTasks || []).filter(
          (task: { assignee_user_id: string; pegawai_id: string }) =>
            task.assignee_user_id === pegawai.id ||
            task.pegawai_id === pegawai.id
        );

        const completedTasks = memberTasks.filter(
          (t: { status: string }) => t.status === "completed"
        );
        const totalTasks = memberTasks.length;
        const completionRate =
          totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0;

        return {
          pegawai_id: pegawai.id,
          nama_lengkap: pegawai.nama_lengkap,
          total_tasks: totalTasks,
          completed_tasks: completedTasks.length,
          completion_rate: Math.round(completionRate),
          avg_completion_time: 0, // Could be calculated if needed
        };
      }
    );

    // Overall statistics
    const totalTasks = (teamTasks || []).length;
    const completedTasks = (teamTasks || []).filter(
      (t: { status: string }) => t.status === "completed"
    ).length;
    const overallCompletionRate =
      totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    const analytics = {
      overview: {
        total_team_members: allPegawai.length,
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        completion_rate: Math.round(overallCompletionRate),
        period_days: parseInt(period),
      },
      workload_distribution: workloadDistribution,
      task_trends: taskTrends,
      member_performance: memberPerformance,
    };

    return NextResponse.json({ data: analytics });
  } catch (error) {
    console.error("Team analytics fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
