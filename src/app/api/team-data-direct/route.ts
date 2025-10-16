import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function GET(_request: NextRequest) {
  try {
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Test with specific user ID from database
    const testUserId = "87aa041a-80bb-4c94-9d83-472ae25eb451";

    // Get team members directly
    const { data: memberRows, error: memberErr } = await serviceClient
      .from("project_members")
      .select(
        `user_id, users:users!project_members_user_id_fkey(id, nama_lengkap, email, is_active), projects:projects!inner(id, ketua_tim_id)`,
      )
      .eq("projects.ketua_tim_id", testUserId);

    if (memberErr) {
      throw memberErr;
    }

    // Remove duplicates and filter active users
    const uniqueUsers = new Map();
    (memberRows || []).forEach((r: any) => {
      if (r.users && r.users.is_active && !uniqueUsers.has(r.users.id)) {
        uniqueUsers.set(r.users.id, r.users);
      }
    });
    const pegawai = Array.from(uniqueUsers.values());

    // Enrich with detailed stats
    const enrichedTeamMembers = await Promise.all(
      pegawai.map(
        async (member: {
          id: string;
          nama_lengkap: string;
          email: string;
          is_active: boolean;
        }) => {
          try {
            // Get task statistics - use both assignee_user_id and pegawai_id for compatibility
            const { data: allTasks } = await serviceClient
              .from("tasks")
              .select("id, status")
              .or(
                `assignee_user_id.eq.${member.id},pegawai_id.eq.${member.id}`,
              );

            const taskStats = {
              pending: (allTasks || []).filter(
                (t: { status: string }) => t.status === "pending",
              ).length,
              in_progress: (allTasks || []).filter(
                (t: { status: string }) => t.status === "in_progress",
              ).length,
              completed: (allTasks || []).filter(
                (t: { status: string }) => t.status === "completed",
              ).length,
              total: (allTasks || []).length,
            };

            // Get monthly earnings - simplified query
            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();

            const { data: earningsRecords } = await serviceClient
              .from("earnings_ledger")
              .select("amount")
              .eq("user_id", member.id)
              .eq("type", "transport")
              .gte(
                "occurred_on",
                new Date(currentYear, currentMonth - 1, 1).toISOString(),
              )
              .lt(
                "occurred_on",
                new Date(currentYear, currentMonth, 1).toISOString(),
              );

            const monthlyEarnings = (earningsRecords || []).reduce(
              (sum: number, record: { amount: number }) => sum + record.amount,
              0,
            );

            // Get actual project assignments for this member
            const { data: projectAssignments } = await serviceClient
              .from("project_members")
              .select(
                `
                projects:projects!inner (
                  id,
                  nama_project,
                  status,
                  deadline,
                  ketua_tim_id
                )
              `,
              )
              .eq("user_id", member.id);

            const currentProjects = (projectAssignments || [])
              .map((assignment: any) => assignment.projects)
              .filter(
                (project: any) =>
                  project && project.ketua_tim_id === testUserId,
              )
              .slice(0, 3); // Limit to 3 projects for display

            const projectCount = currentProjects.length;
            const workloadLevel =
              projectCount === 0
                ? "low"
                : projectCount <= 2
                  ? "medium"
                  : "high";

            return {
              ...member,
              workload: {
                project_count: projectCount,
                workload_level: workloadLevel as "low" | "medium" | "high",
              },
              current_projects: currentProjects.map((project: any) => ({
                id: project.id,
                nama_project: project.nama_project,
                status: project.status,
                deadline: project.deadline
                  ? new Date(project.deadline).toISOString().split("T")[0]
                  : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                      .toISOString()
                      .split("T")[0],
              })),
              task_stats: taskStats,
              monthly_earnings: monthlyEarnings,
            };
          } catch (error) {
            console.error(`Error processing member ${member.id}:`, error);
            return {
              ...member,
              workload: { project_count: 0, workload_level: "low" as const },
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
        },
      ),
    );

    return NextResponse.json({ data: enrichedTeamMembers });
  } catch (error) {
    console.error("🔍 DEBUG: Team data direct API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
