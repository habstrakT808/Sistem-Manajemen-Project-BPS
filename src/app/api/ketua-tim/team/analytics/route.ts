// File: src/app/api/ketua-tim/team/analytics/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !userProfile ||
      (userProfile as { role: string }).role !== "ketua_tim"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Get team performance metrics
    const { data: teamTasks } = await supabase
      .from("tasks")
      .select(
        `
        status,
        created_at,
        updated_at,
        pegawai_id,
        projects!inner (
          ketua_tim_id
        ),
        users!inner (
          nama_lengkap
        )
      `
      )
      .eq("projects.ketua_tim_id", user.id)
      .gte("created_at", startDate.toISOString());

    // Get workload distribution
    const { data: allPegawai } = await supabase
      .from("users")
      .select("id, nama_lengkap")
      .eq("role", "pegawai")
      .eq("is_active", true);

    const workloadDistribution = await Promise.all(
      (allPegawai || []).map(
        async (pegawai: { id: string; nama_lengkap: string }) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: workload } = await (supabase as any).rpc(
            "get_pegawai_workload",
            {
              pegawai_id: pegawai.id,
              start_date: new Date().toISOString().split("T")[0],
              end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0],
            }
          );

          return {
            pegawai_id: pegawai.id,
            nama_lengkap: pegawai.nama_lengkap,
            project_count: workload?.[0]?.project_count || 0,
            workload_level: workload?.[0]?.workload_level || "low",
          };
        }
      )
    );

    // Calculate task completion trends
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
          (task: { pegawai_id: string }) => task.pegawai_id === pegawai.id
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
        total_team_members: (allPegawai || []).length,
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
