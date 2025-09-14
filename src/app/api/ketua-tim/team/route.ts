// File: src/app/api/ketua-tim/team/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    // Get all pegawai
    const { data: pegawai, error: pegawaiError } = await supabase
      .from("users")
      .select("id, nama_lengkap, email, is_active")
      .eq("role", "pegawai")
      .eq("is_active", true)
      .order("nama_lengkap");

    if (pegawaiError) {
      throw pegawaiError;
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
            // Get workload data
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: workload } = await (supabase as any).rpc(
              "get_pegawai_workload",
              {
                pegawai_id: member.id,
                start_date: new Date().toISOString().split("T")[0],
                end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                  .toISOString()
                  .split("T")[0],
              }
            );

            // Get current projects for this pegawai from ketua tim's projects
            const { data: projectAssignments } = await supabase
              .from("project_assignments")
              .select(
                `
              projects!inner (
                id,
                nama_project,
                status,
                deadline,
                ketua_tim_id
              )
            `
              )
              .eq("assignee_type", "pegawai")
              .eq("assignee_id", member.id)
              .eq("projects.ketua_tim_id", user.id)
              .in("projects.status", ["upcoming", "active"]);

            const currentProjects = (projectAssignments || []).map(
              (assignment: {
                projects: {
                  id: string;
                  nama_project: string;
                  status: string;
                  deadline: string;
                };
              }) => assignment.projects
            );

            // Get task statistics
            const { data: allTasks } = await supabase
              .from("tasks")
              .select(
                `
              status,
              projects!inner (
                ketua_tim_id
              )
            `
              )
              .eq("pegawai_id", member.id)
              .eq("projects.ketua_tim_id", user.id);

            const taskStats = {
              pending: (allTasks || []).filter(
                (t: { status: string }) => t.status === "pending"
              ).length,
              in_progress: (allTasks || []).filter(
                (t: { status: string }) => t.status === "in_progress"
              ).length,
              completed: (allTasks || []).filter(
                (t: { status: string }) => t.status === "completed"
              ).length,
              total: (allTasks || []).length,
            };

            // Get monthly earnings (current month)
            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();

            const { data: financialRecords } = await supabase
              .from("financial_records")
              .select("amount")
              .eq("recipient_type", "pegawai")
              .eq("recipient_id", member.id)
              .eq("bulan", currentMonth)
              .eq("tahun", currentYear);

            const monthlyEarnings = (financialRecords || []).reduce(
              (sum: number, record: { amount: number }) => sum + record.amount,
              0
            );

            return {
              ...member,
              workload: workload?.[0] || {
                project_count: 0,
                workload_level: "low",
              },
              current_projects: currentProjects,
              task_stats: taskStats,
              monthly_earnings: monthlyEarnings,
            };
          } catch (error) {
            console.error(
              `Error getting stats for member ${member.id}:`,
              error
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
        }
      )
    );

    return NextResponse.json({ data: enrichedTeamMembers });
  } catch (error) {
    console.error("Team data fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
