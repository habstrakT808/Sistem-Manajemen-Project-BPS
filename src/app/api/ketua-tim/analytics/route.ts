// File: src/app/api/ketua-tim/analytics/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface AnalyticsStats {
  total_projects: number;
  completion_rate: number;
  average_project_duration: number;
  team_utilization: number;
  on_time_delivery: number;
  budget_efficiency: number;
}

interface ProjectPerformance {
  project_name: string;
  completion_percentage: number;
  days_remaining: number;
  team_size: number;
  budget_used: number;
  status: "on_track" | "at_risk" | "delayed";
}

interface TeamProductivity {
  member_name: string;
  tasks_completed: number;
  tasks_pending: number;
  completion_rate: number;
  projects_assigned: number;
  workload_level: "low" | "medium" | "high";
}

export async function GET(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createClient()) as any;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "3_months";

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role validation
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

    // Calculate date range
    let monthsBack = 3;
    switch (period) {
      case "1_month":
        monthsBack = 1;
        break;
      case "6_months":
        monthsBack = 6;
        break;
      case "1_year":
        monthsBack = 12;
        break;
    }

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsBack);

    // Get all projects for analytics
    const { data: allProjects } = await supabase
      .from("projects")
      .select(
        `
        id,
        nama_project,
        status,
        tanggal_mulai,
        deadline,
        created_at,
        project_assignments (id)
      `
      )
      .eq("ketua_tim_id", user.id)
      .gte("created_at", startDate.toISOString());

    const totalProjects = (allProjects || []).length;
    const completedProjects = (allProjects || []).filter(
      (p: { status: string }) => p.status === "completed"
    ).length;
    const completionRate =
      totalProjects > 0
        ? Math.round((completedProjects / totalProjects) * 100)
        : 0;

    // Calculate average project duration for completed projects
    const completedProjectsWithDuration = (allProjects || [])
      .filter(
        (p: { status: string; tanggal_mulai: string; deadline: string }) =>
          p.status === "completed"
      )
      .map((p: { tanggal_mulai: string; deadline: string }) => {
        const start = new Date(p.tanggal_mulai);
        const end = new Date(p.deadline);
        return Math.ceil(
          (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
        );
      });

    const averageDuration =
      completedProjectsWithDuration.length > 0
        ? Math.round(
            completedProjectsWithDuration.reduce(
              (sum: number, duration: number) => sum + duration,
              0
            ) / completedProjectsWithDuration.length
          )
        : 0;

    // Calculate on-time delivery
    const onTimeProjects = (allProjects || []).filter(
      (p: { status: string; deadline: string }) => {
        if (p.status !== "completed") return false;
        // For this example, assume all completed projects were on time
        // In reality, you'd track actual completion dates
        return new Date(p.deadline) >= new Date();
      }
    ).length;

    const onTimeDelivery =
      completedProjects > 0
        ? Math.round((onTimeProjects / completedProjects) * 100)
        : 100;

    // Get current active projects for performance analysis
    const { data: activeProjects } = await supabase
      .from("projects")
      .select(
        `
        id,
        nama_project,
        tanggal_mulai,
        deadline,
        project_assignments (id)
      `
      )
      .eq("ketua_tim_id", user.id)
      .eq("status", "active");

    // Calculate project performance
    const projectPerformance: ProjectPerformance[] = await Promise.all(
      (activeProjects || []).map(
        async (project: {
          id: string;
          nama_project: string;
          tanggal_mulai: string;
          deadline: string;
          project_assignments: Array<{ id: string }>;
        }) => {
          // Get tasks for this project
          const { data: projectTasks } = await supabase
            .from("tasks")
            .select("status")
            .eq("project_id", project.id);

          const totalTasks = (projectTasks || []).length;
          const completedTasks = (projectTasks || []).filter(
            (t: { status: string }) => t.status === "completed"
          ).length;
          const completionPercentage =
            totalTasks > 0
              ? Math.round((completedTasks / totalTasks) * 100)
              : 0;

          // Calculate days remaining
          const today = new Date();
          const deadline = new Date(project.deadline);
          const daysRemaining = Math.ceil(
            (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );

          // Calculate project timeline progress
          const startDate = new Date(project.tanggal_mulai);
          const totalDays = Math.ceil(
            (deadline.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          const daysPassed = Math.ceil(
            (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          const timelineProgress =
            totalDays > 0 ? Math.round((daysPassed / totalDays) * 100) : 0;

          // Determine status
          let status: "on_track" | "at_risk" | "delayed" = "on_track";
          if (daysRemaining < 0) {
            status = "delayed";
          } else if (completionPercentage < timelineProgress - 10) {
            status = "at_risk";
          }

          return {
            project_name: project.nama_project,
            completion_percentage: completionPercentage,
            days_remaining: Math.max(0, daysRemaining),
            team_size: (project.project_assignments || []).length,
            budget_used: Math.min(100, Math.max(0, timelineProgress)), // Simplified budget calculation
            status,
          };
        }
      )
    );

    // Get team productivity data
    const { data: teamMembers } = await supabase
      .from("project_assignments")
      .select(
        `
        assignee_id,
        users!inner (nama_lengkap),
        projects!inner (ketua_tim_id)
      `
      )
      .eq("assignee_type", "pegawai")
      .eq("projects.ketua_tim_id", user.id);

    const uniqueMembers = Array.from(
      new Map(
        (teamMembers || []).map(
          (member: {
            assignee_id: string;
            users: { nama_lengkap: string };
          }) => [member.assignee_id, member.users.nama_lengkap]
        )
      ).entries()
    );

    const teamProductivity: TeamProductivity[] = await Promise.all(
      uniqueMembers.map(async ([memberId, memberName]) => {
        // Get tasks for this member
        const { data: memberTasks } = await supabase
          .from("tasks")
          .select(
            `
            status,
            projects!inner (ketua_tim_id)
          `
          )
          .eq("pegawai_id", memberId)
          .eq("projects.ketua_tim_id", user.id)
          .gte("created_at", startDate.toISOString());

        const totalTasks = (memberTasks || []).length;
        const completedTasks = (memberTasks || []).filter(
          (t: { status: string }) => t.status === "completed"
        ).length;
        const pendingTasks = (memberTasks || []).filter(
          (t: { status: string }) => t.status === "pending"
        ).length;
        const completionRate =
          totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        // Get current project assignments
        const { data: currentProjects } = await supabase
          .from("project_assignments")
          .select(
            `
            projects!inner (ketua_tim_id, status)
          `
          )
          .eq("assignee_type", "pegawai")
          .eq("assignee_id", memberId)
          .eq("projects.ketua_tim_id", user.id)
          .in("projects.status", ["upcoming", "active"]);

        const projectsAssigned = (currentProjects || []).length;

        // Determine workload level
        let workloadLevel: "low" | "medium" | "high" = "low";
        if (projectsAssigned > 4) {
          workloadLevel = "high";
        } else if (projectsAssigned > 2) {
          workloadLevel = "medium";
        }

        return {
          member_name: memberName as string,
          tasks_completed: completedTasks,
          tasks_pending: pendingTasks,
          completion_rate: completionRate,
          projects_assigned: projectsAssigned,
          workload_level: workloadLevel,
        };
      })
    );

    // Calculate team utilization
    const totalTeamMembers = uniqueMembers.length;
    const activeMembers = teamProductivity.filter(
      (member) => member.projects_assigned > 0
    ).length;
    const teamUtilization =
      totalTeamMembers > 0
        ? Math.round((activeMembers / totalTeamMembers) * 100)
        : 0;

    // Calculate budget efficiency (simplified)
    const budgetEfficiency = Math.round(75 + Math.random() * 20); // Mock calculation for now

    // Generate monthly trends
    const monthlyTrends = [];
    for (let i = 3; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const { data: monthProjects } = await supabase
        .from("projects")
        .select("id, status")
        .eq("ketua_tim_id", user.id)
        .gte("created_at", monthStart.toISOString())
        .lte("created_at", monthEnd.toISOString());

      const { data: monthTasks } = await supabase
        .from("tasks")
        .select(
          `
          status,
          projects!inner (ketua_tim_id)
        `
        )
        .eq("projects.ketua_tim_id", user.id)
        .eq("status", "completed")
        .gte("updated_at", monthStart.toISOString())
        .lte("updated_at", monthEnd.toISOString());

      const { data: monthFinancial } = await supabase
        .from("financial_records")
        .select(
          `
          amount,
          projects!inner (ketua_tim_id)
        `
        )
        .eq("projects.ketua_tim_id", user.id)
        .eq("bulan", date.getMonth() + 1)
        .eq("tahun", date.getFullYear());

      const budgetSpent = (monthFinancial || []).reduce(
        (sum: number, record: { amount: number }) => sum + record.amount,
        0
      );

      monthlyTrends.push({
        month: date.toLocaleDateString("en-US", { month: "short" }),
        projects_completed: (monthProjects || []).filter(
          (p: { status: string }) => p.status === "completed"
        ).length,
        tasks_completed: (monthTasks || []).length,
        budget_spent: budgetSpent,
      });
    }

    const stats: AnalyticsStats = {
      total_projects: totalProjects,
      completion_rate: completionRate,
      average_project_duration: averageDuration,
      team_utilization: teamUtilization,
      on_time_delivery: onTimeDelivery,
      budget_efficiency: budgetEfficiency,
    };

    return NextResponse.json({
      stats,
      project_performance: projectPerformance,
      team_productivity: teamProductivity,
      monthly_trends: monthlyTrends,
    });
  } catch (error) {
    console.error("Analytics API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
