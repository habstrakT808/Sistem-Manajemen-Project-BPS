import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(_request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();

    // Get all statistics in parallel - simplified queries for debugging
    const [
      usersResult,
      mitraResult,
      allProjectsResult,
      activeProjectsResult,
      completedProjectsResult,
      teamsResult,
      transportResult,
    ] = await Promise.allSettled([
      // Total users
      supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),

      // Total mitra (all mitra, not just active) - simplified query
      supabase.from("mitra").select("id"),

      // All projects that still belong to a team
      supabase
        .from("projects")
        .select("id, team_id")
        .not("team_id", "is", null),

      // Active projects that still belong to a team
      supabase
        .from("projects")
        .select("id, team_id")
        .eq("status", "active")
        .not("team_id", "is", null),

      // Completed projects that still belong to a team
      supabase
        .from("projects")
        .select("id, team_id")
        .eq("status", "completed")
        .not("team_id", "is", null),

      // Total teams - simplified query
      supabase.from("teams").select("id"),

      // Monthly transport - current month (only allocations whose task.project still has a team)
      (() => {
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        return supabase
          .from("task_transport_allocations")
          .select("id, amount, task_id, created_at")
          .gte(
            "created_at",
            `${currentYear}-${currentMonth.toString().padStart(2, "0")}-01`,
          )
          .lt(
            "created_at",
            `${currentYear}-${(currentMonth + 1).toString().padStart(2, "0")}-01`,
          );
      })(),
    ]);

    // Extract results with proper error handling - manual counting
    const totalUsers =
      usersResult.status === "fulfilled" ? usersResult.value.count || 0 : 0;
    const totalMitra =
      mitraResult.status === "fulfilled"
        ? mitraResult.value.data?.length || 0
        : 0;
    const totalProjects =
      allProjectsResult.status === "fulfilled"
        ? allProjectsResult.value.data?.length || 0
        : 0;
    const activeProjects =
      activeProjectsResult.status === "fulfilled"
        ? activeProjectsResult.value.data?.length || 0
        : 0;
    const completedProjects =
      completedProjectsResult.status === "fulfilled"
        ? completedProjectsResult.value.data?.length || 0
        : 0;
    const totalTeams =
      teamsResult.status === "fulfilled"
        ? teamsResult.value.data?.length || 0
        : 0;

    let monthlyTransport = 0;
    if (transportResult.status === "fulfilled" && transportResult.value.data) {
      const allocations = transportResult.value.data as Array<{
        id: string;
        amount: number;
        task_id: string;
      }>;
      const taskIds = Array.from(
        new Set(allocations.map((a) => a.task_id).filter(Boolean)),
      );
      if (taskIds.length > 0) {
        const { data: tasks } = await supabase
          .from("tasks")
          .select("id, project_id")
          .in("id", taskIds);
        const projectIds = Array.from(
          new Set(
            (tasks || []).map((t) => (t as any).project_id).filter(Boolean),
          ),
        );
        let okProjects = new Set<string>();
        if (projectIds.length > 0) {
          const { data: projects } = await supabase
            .from("projects")
            .select("id, team_id")
            .in("id", projectIds)
            .not("team_id", "is", null);
          okProjects = new Set((projects || []).map((p: any) => p.id));
        }
        monthlyTransport = allocations
          .filter((a) => {
            const task = (tasks || []).find(
              (t) => (t as any).id === a.task_id,
            ) as any;
            return task && okProjects.has(task.project_id);
          })
          .reduce((sum, a) => sum + (a.amount || 0), 0);
      }
    }

    // Log any errors for debugging
    [
      usersResult,
      mitraResult,
      allProjectsResult,
      activeProjectsResult,
      completedProjectsResult,
      teamsResult,
      transportResult,
    ].forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(`Dashboard query ${index} failed:`, result.reason);
      }
    });

    const stats = {
      total_users: totalUsers,
      total_projects: totalProjects,
      active_projects: activeProjects,
      completed_projects: completedProjects,
      total_teams: totalTeams,
      total_mitra: totalMitra,
      monthly_transport: monthlyTransport,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
