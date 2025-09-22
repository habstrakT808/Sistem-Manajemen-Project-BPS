// File: src/app/api/ketua-tim/analytics/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/../database/types/database.types";

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
  status: "on_track" | "at_risk" | "delayed" | "completed";
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
    const svc = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
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

    // Do not block by global role; enforce ownership in queries

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

    // Get ALL owned projects (no date filter) for core stats and membership
    let { data: ownedAllProjects } = await (svc as any)
      .from("projects")
      .select(
        `id, nama_project, status, tanggal_mulai, deadline, created_at, updated_at`
      )
      .or(`ketua_tim_id.eq.${user.id},leader_user_id.eq.${user.id}`);

    // Fallback: if no direct ownership found, include projects where user is a member/assignee
    if (!ownedAllProjects || ownedAllProjects.length === 0) {
      const [memberRows, assignmentRows] = await Promise.all([
        (svc as any)
          .from("project_members")
          .select("project_id")
          .eq("user_id", user.id),
        (svc as any)
          .from("project_assignments")
          .select("project_id")
          .eq("assignee_id", user.id),
      ]);

      const memberIds = new Set(
        (memberRows?.data || []).map(
          (r: { project_id: string }) => r.project_id
        )
      );
      for (const r of assignmentRows?.data || []) {
        memberIds.add((r as { project_id: string }).project_id);
      }

      if (memberIds.size > 0) {
        const { data: derivedProjects } = await (svc as any)
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
          .in("id", Array.from(memberIds));
        ownedAllProjects = derivedProjects || [];
      }
    }

    // Owned project IDs used throughout
    const ownedIdArray = Array.from(
      new Set((ownedAllProjects || []).map((p: any) => p.id))
    );

    // For widgets that should be ALL-TIME, use all owned projects
    const totalProjects = (ownedAllProjects || []).length;
    const completedProjects = (ownedAllProjects || []).filter(
      (p: { status: string }) => p.status === "completed"
    ).length;
    const completionRate =
      totalProjects > 0
        ? Math.round((completedProjects / totalProjects) * 100)
        : 0;

    // Calculate average project duration for completed projects
    const completedProjectsWithDuration = (ownedAllProjects || [])
      .filter(
        (p: { status: string; tanggal_mulai: string; updated_at: string }) =>
          p.status === "completed"
      )
      .map((p: { tanggal_mulai: string; updated_at: string }) => {
        const start = new Date(p.tanggal_mulai);
        // Use updated_at as the completion timestamp when status is completed
        const end = new Date(p.updated_at);
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
    const onTimeProjects = (ownedAllProjects || []).filter(
      (p: { status: string; deadline: string; updated_at: string }) => {
        if (p.status !== "completed") return false;
        // Consider a project on-time if it was completed (updated_at) on or before its deadline
        return new Date(p.updated_at) <= new Date(p.deadline);
      }
    ).length;

    const onTimeDelivery =
      completedProjects > 0
        ? Math.round((onTimeProjects / completedProjects) * 100)
        : 100;

    // Get current active projects for performance analysis (owned only)
    const { data: activeProjects } = await (svc as any)
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
      .in(
        "id",
        ownedIdArray.length
          ? ownedIdArray
          : ["00000000-0000-0000-0000-000000000000"]
      ) // guard empty
      .eq("status", "active");

    // Calculate project performance
    // If no active projects, fallback to recently updated owned projects (up to 5)
    const projectsForPerf =
      activeProjects && activeProjects.length > 0
        ? activeProjects
        : (ownedAllProjects || [])
            .slice()
            .sort(
              (a: any, b: any) =>
                new Date(b.updated_at || b.deadline || 0).getTime() -
                new Date(a.updated_at || a.deadline || 0).getTime()
            )
            .slice(0, 5);

    const projectPerformance: ProjectPerformance[] = await Promise.all(
      (projectsForPerf || []).map(
        async (project: {
          id: string;
          nama_project: string;
          tanggal_mulai: string;
          deadline: string;
          project_assignments?: Array<{ id: string }>;
        }) => {
          // Get tasks for this project
          const { data: projectTasks } = await (svc as any)
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
          let status: "on_track" | "at_risk" | "delayed" | "completed" =
            "on_track";
          if (completionPercentage === 100) {
            status = "completed";
          } else if (daysRemaining < 0) {
            status = "delayed";
          } else if (completionPercentage < timelineProgress - 10) {
            status = "at_risk";
          }

          // Team size: count assignments for this project
          const { count: assignmentCount } = await (svc as any)
            .from("project_assignments")
            .select("id", { count: "exact", head: true })
            .eq("project_id", project.id);

          return {
            project_name: project.nama_project,
            completion_percentage: completionPercentage,
            days_remaining: Math.max(0, daysRemaining),
            team_size: assignmentCount || 0,
            budget_used: Math.min(100, Math.max(0, timelineProgress)), // Simplified budget calculation
            status,
          };
        }
      )
    );

    // Team members across owned projects
    const { data: teamAssignments } = ownedIdArray.length
      ? await (svc as any)
          .from("project_assignments")
          .select(`assignee_id`)
          .eq("assignee_type", "pegawai")
          .in("project_id", ownedIdArray)
      : { data: [] };
    const uniqueMembers = Array.from(
      new Set(
        (teamAssignments || []).map(
          (r: { assignee_id: string }) => r.assignee_id
        )
      )
    ).map((id) => [String(id), String(id)] as [string, string]);

    const teamProductivity: TeamProductivity[] = await Promise.all(
      uniqueMembers.map(async ([memberId]) => {
        const memberNameRow = await (svc as any)
          .from("users")
          .select("nama_lengkap")
          .eq("id", memberId)
          .single();
        const memberName =
          memberNameRow?.data?.nama_lengkap ||
          `User ${String(memberId).slice(0, 6)}`;
        // Get tasks for this member
        const { data: memberTasks } = await (svc as any)
          .from("tasks")
          .select(`status, project_id, created_at`)
          .eq("pegawai_id", memberId)
          .in("project_id", ownedIdArray)
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
        const { data: currentProjects } = await (svc as any)
          .from("project_assignments")
          .select("project_id")
          .eq("assignee_type", "pegawai")
          .eq("assignee_id", memberId);
        const activeOwnedProjectIds = new Set(
          (ownedAllProjects as Array<any>)
            .filter((p) => p.status === "active" || p.status === "upcoming")
            .map((p) => p.id)
        );
        const projectsAssigned = (currentProjects || []).filter(
          (r: { project_id: string }) => activeOwnedProjectIds.has(r.project_id)
        ).length;

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

      const { data: monthProjects } = await (svc as any)
        .from("projects")
        .select("id, status, updated_at")
        .in(
          "id",
          ownedIdArray.length
            ? ownedIdArray
            : ["00000000-0000-0000-0000-000000000000"]
        )
        // Count projects that were completed in this month by looking at updated_at
        .gte("updated_at", monthStart.toISOString())
        .lte("updated_at", monthEnd.toISOString());

      const { data: monthTasks } = await (svc as any)
        .from("tasks")
        .select(`status, project_id, updated_at`)
        .eq("status", "completed")
        .in(
          "project_id",
          ownedIdArray.length
            ? ownedIdArray
            : ["00000000-0000-0000-0000-000000000000"]
        )
        .gte("updated_at", monthStart.toISOString())
        .lte("updated_at", monthEnd.toISOString());

      const { data: monthFinancial } = await (svc as any)
        .from("financial_records")
        .select(`amount, project_id, bulan, tahun`)
        .in(
          "project_id",
          ownedIdArray.length
            ? ownedIdArray
            : ["00000000-0000-0000-0000-000000000000"]
        )
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
