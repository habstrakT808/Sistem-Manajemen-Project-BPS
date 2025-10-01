import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function GET(_request: NextRequest) {
  try {
    console.log("🔍 DEBUG: Debug member detail API called!");

    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Test with specific member ID
    const memberId = "87aa041a-80bb-4c94-9d83-472ae25eb451";
    console.log("🔍 DEBUG: Testing with member ID:", memberId);

    // Get member personal info
    const { data: memberInfo, error: memberError } = await serviceClient
      .from("users")
      .select(
        "id, nama_lengkap, email, no_telepon, alamat, is_active, created_at, role",
      )
      .eq("id", memberId)
      .single();

    console.log("🔍 DEBUG: Member info:", memberInfo);
    console.log("🔍 DEBUG: Member error:", memberError);

    if (memberError || !memberInfo) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Get current projects for this member
    const { data: projectAssignments } = await serviceClient
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
      `,
      )
      .eq("user_id", memberId);

    console.log("🔍 DEBUG: Project assignments:", projectAssignments);

    // Get all tasks for this member
    const { data: allTasks } = await serviceClient
      .from("tasks")
      .select(
        `
        id,
        status,
        created_at,
        updated_at,
        assignee_user_id
      `,
      )
      .eq("assignee_user_id", memberId);

    console.log("🔍 DEBUG: All tasks:", allTasks);

    // Calculate task statistics
    const totalTasks = (allTasks || []).length;
    const pendingTasks = (allTasks || []).filter(
      (t: { status: string }) => t.status === "pending",
    ).length;
    const inProgressTasks = (allTasks || []).filter(
      (t: { status: string }) => t.status === "in_progress",
    ).length;
    const completedTasks = (allTasks || []).filter(
      (t: { status: string }) => t.status === "completed",
    ).length;
    const completionRate =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    console.log("🔍 DEBUG: Task statistics:", {
      totalTasks,
      pendingTasks,
      inProgressTasks,
      completedTasks,
      completionRate,
    });

    // Get monthly earnings
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const { data: currentMonthEarnings } = await serviceClient
      .from("earnings_ledger")
      .select("amount, occurred_on")
      .eq("user_id", memberId)
      .eq("type", "transport")
      .gte(
        "occurred_on",
        new Date(currentYear, currentMonth - 1, 1).toISOString(),
      )
      .lt("occurred_on", new Date(currentYear, currentMonth, 1).toISOString());

    const currentMonthTotal = (currentMonthEarnings || []).reduce(
      (sum: number, record: { amount: number }) => sum + record.amount,
      0,
    );

    console.log("🔍 DEBUG: Monthly earnings:", {
      currentMonthEarnings,
      currentMonthTotal,
    });

    // Calculate real project data for each project
    const currentProjects = await Promise.all(
      (projectAssignments || []).map(async (assignment: any) => {
        const project = assignment.projects;

        // Get tasks for this specific project and member
        const { data: projectTasks } = await serviceClient
          .from("tasks")
          .select("id, status")
          .eq("project_id", project.id)
          .eq("assignee_user_id", memberId);

        const projectTaskCount = (projectTasks || []).length;
        const projectCompletedTasks = (projectTasks || []).filter(
          (t: { status: string }) => t.status === "completed",
        ).length;
        const projectProgress =
          projectTaskCount > 0
            ? Math.round((projectCompletedTasks / projectTaskCount) * 100)
            : 0;

        // Get transport amount for this specific project
        // First get all transport earnings for this user
        const { data: allUserEarnings } = await serviceClient
          .from("earnings_ledger")
          .select("amount, source_id")
          .eq("user_id", memberId)
          .eq("type", "transport");

        // Get transport allocations for these tasks
        const taskIds = (projectTasks || []).map((t: { id: string }) => t.id);
        const { data: transportAllocations } = await serviceClient
          .from("task_transport_allocations")
          .select("id")
          .in("task_id", taskIds);

        const allocationIds = (transportAllocations || []).map(
          (a: { id: string }) => a.id,
        );

        // Find earnings that match these allocation IDs
        const projectEarnings = (allUserEarnings || []).filter(
          (earning: { source_id: string }) =>
            allocationIds.includes(earning.source_id),
        );

        const projectTransport = (projectEarnings || []).reduce(
          (sum: number, record: { amount: number }) => sum + record.amount,
          0,
        );

        console.log(
          `🔍 DEBUG: Project ${project.nama_project} - Tasks: ${projectTaskCount}, Completed: ${projectCompletedTasks}, Progress: ${projectProgress}%, Transport: ${projectTransport}`,
        );

        return {
          id: project.id,
          nama_project: project.nama_project,
          status: project.status,
          tanggal_mulai: project.tanggal_mulai,
          deadline: project.deadline,
          progress: projectProgress,
          uang_transport: projectTransport,
          task_count: projectTaskCount,
          completed_tasks: projectCompletedTasks,
        };
      }),
    );

    const memberDetail = {
      personal_info: memberInfo,
      current_projects: currentProjects,
      task_statistics: {
        total_tasks: totalTasks,
        pending_tasks: pendingTasks,
        in_progress_tasks: inProgressTasks,
        completed_tasks: completedTasks,
        completion_rate: completionRate,
        average_completion_time: 0, // Simplified
      },
      monthly_earnings: {
        current_month: {
          total: currentMonthTotal,
          breakdown: [], // Simplified
        },
        historical: [], // Simplified
      },
      calendar_data: [], // Simplified
      performance_metrics: {
        task_completion_trend: [], // Simplified
        project_participation: [], // Simplified
        monthly_productivity: [], // Simplified
      },
    };

    console.log("🔍 DEBUG: Final member detail data:", memberDetail);
    return NextResponse.json({ data: memberDetail });
  } catch (error) {
    console.error("🔍 DEBUG: Debug member detail API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
