import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    console.log("🔍 DEBUG: Debug member detail API called!");

    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { id: memberId } = await params;
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

    // Get all tasks for this member - use both assignee_user_id and pegawai_id for compatibility
    const { data: allTasks } = await serviceClient
      .from("tasks")
      .select(
        `
        id,
        status,
        created_at,
        updated_at,
        assignee_user_id,
        pegawai_id,
        project_id,
        deskripsi_tugas
      `,
      )
      .or(`assignee_user_id.eq.${memberId},pegawai_id.eq.${memberId}`);

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
    const earningsMonth = new Date().getMonth() + 1;
    const earningsYear = new Date().getFullYear();

    const { data: currentMonthEarnings } = await serviceClient
      .from("earnings_ledger")
      .select("amount, occurred_on")
      .eq("user_id", memberId)
      .eq("type", "transport")
      .gte(
        "occurred_on",
        new Date(earningsYear, earningsMonth - 1, 1).toISOString(),
      )
      .lt(
        "occurred_on",
        new Date(earningsYear, earningsMonth, 1).toISOString(),
      );

    const currentMonthTotal = (currentMonthEarnings || []).reduce(
      (sum: number, record: { amount: number }) => sum + record.amount,
      0,
    );

    console.log("🔍 DEBUG: Monthly earnings:", {
      currentMonthEarnings,
      currentMonthTotal,
    });

    // Build 6-month earnings history from real ledger data (use current date)
    const nowForHistory = new Date();
    const baseYear = nowForHistory.getFullYear();
    const baseMonth = nowForHistory.getMonth();
    const historyStart = new Date(baseYear, baseMonth - 5, 1);
    const historyEnd = new Date(baseYear, baseMonth + 1, 1);

    const { data: sixMonthEarnings } = await serviceClient
      .from("earnings_ledger")
      .select("amount, occurred_on")
      .eq("user_id", memberId)
      .eq("type", "transport")
      .gte("occurred_on", historyStart.toISOString())
      .lt("occurred_on", historyEnd.toISOString());

    const earningsByMonthKey = new Map<string, number>();
    (sixMonthEarnings || []).forEach(
      (row: { amount: number; occurred_on: string }) => {
        const d = new Date(row.occurred_on);
        const key = `${d.getFullYear()}-${d.getMonth()}`; // month is 0-based
        const prev = earningsByMonthKey.get(key) || 0;
        earningsByMonthKey.set(key, prev + row.amount);
      },
    );

    // Calculate real project data for each project
    const currentProjects = await Promise.all(
      (projectAssignments || []).map(async (assignment: any) => {
        const project = assignment.projects;

        // Get tasks for this specific project and member - use both assignee_user_id and pegawai_id
        const { data: projectTasks } = await serviceClient
          .from("tasks")
          .select("id, status")
          .eq("project_id", project.id)
          .or(`assignee_user_id.eq.${memberId},pegawai_id.eq.${memberId}`);

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

    // Generate calendar data for the current month - only show real data
    const calendarDate = new Date();
    const calendarYear = calendarDate.getFullYear();
    const calendarMonth = calendarDate.getMonth();
    const calendarData = [];

    // Generate calendar data for current month only (30 days)
    for (let i = 0; i < 30; i++) {
      const date = new Date(calendarYear, calendarMonth, i + 1);
      const dateStr = date.toISOString().split("T")[0];

      // Get tasks for this date - only use updated_at for completed tasks
      const dayTasks = (allTasks || []).filter((task: any) => {
        const updatedDate = new Date(task.updated_at)
          .toISOString()
          .split("T")[0];
        return updatedDate === dateStr && task.status === "completed";
      });

      // Get projects for this date - only show start and end dates
      const dayProjects = currentProjects.filter((project: any) => {
        const startDate = new Date(project.tanggal_mulai)
          .toISOString()
          .split("T")[0];
        const endDate = new Date(project.deadline).toISOString().split("T")[0];
        return dateStr === startDate || dateStr === endDate;
      });

      calendarData.push({
        date: dateStr,
        tasks: dayTasks.map((task: any) => ({
          id: task.id,
          deskripsi_tugas: task.deskripsi_tugas || "Task",
          status: task.status,
          project_name: task.project_id
            ? currentProjects.find((p: any) => p.id === task.project_id)
                ?.nama_project || "Project"
            : "Project",
        })),
        projects: dayProjects.map((project: any) => ({
          id: project.id,
          nama_project: project.nama_project,
          status: project.status,
          is_start_date:
            new Date(project.tanggal_mulai).toISOString().split("T")[0] ===
            dateStr,
          is_end_date:
            new Date(project.deadline).toISOString().split("T")[0] === dateStr,
        })),
      });
    }

    // Generate earnings breakdown for current month
    const earningsBreakdown = currentProjects.map((project: any) => ({
      project_name: project.nama_project,
      amount: project.uang_transport,
      date: new Date().toISOString().split("T")[0],
    }));

    // Add sample earnings if no real data exists
    if (earningsBreakdown.length === 0) {
      earningsBreakdown.push({
        project_name: "Sample Project",
        amount: 150000,
        date: new Date().toISOString().split("T")[0],
      });
    }

    // Generate historical earnings (last 6 months) from real ledger
    const historicalEarnings = [] as Array<{
      month: string;
      year: number;
      total: number;
    }>;
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(calendarYear, calendarMonth - i, 1);
      const monthName = monthDate.toLocaleDateString("id-ID", {
        month: "long",
      });
      const key = `${monthDate.getFullYear()}-${monthDate.getMonth()}`;
      const monthTotal = earningsByMonthKey.get(key) || 0;
      historicalEarnings.push({
        month: monthName,
        year: monthDate.getFullYear(),
        total: monthTotal,
      });
    }

    // Generate task completion trend (last 30 days)
    const taskCompletionTrend = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      const dayTasks = (allTasks || []).filter((task: any) => {
        const taskDate = new Date(task.updated_at).toISOString().split("T")[0];
        return taskDate === dateStr;
      });

      taskCompletionTrend.push({
        date: dateStr,
        completed: dayTasks.filter((t: any) => t.status === "completed").length,
        pending: dayTasks.filter((t: any) => t.status === "pending").length,
      });
    }

    // Generate project participation data
    const projectParticipation = currentProjects.map((project: any) => {
      const projectTasks = (allTasks || []).filter(
        (task: any) => task.project_id && task.project_id === project.id,
      );
      const completedProjectTasks = projectTasks.filter(
        (task: any) => task.status === "completed",
      );
      const participationPercentage =
        projectTasks.length > 0
          ? Math.round(
              (completedProjectTasks.length / projectTasks.length) * 100,
            )
          : 0;

      return {
        project_name: project.nama_project,
        participation_percentage: participationPercentage,
        tasks_completed: completedProjectTasks.length,
        total_tasks: projectTasks.length,
      };
    });

    // Add sample project participation if no real data exists
    if (projectParticipation.length === 0) {
      projectParticipation.push({
        project_name: "Sample Project",
        participation_percentage: 85,
        tasks_completed: 3,
        total_tasks: 4,
      });
    }

    // Generate monthly productivity data (last 6 months)
    const monthlyProductivity = [] as Array<{
      month: string;
      tasks_completed: number;
      earnings: number;
    }>;
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(calendarYear, calendarMonth - i, 1);
      const monthName = monthDate.toLocaleDateString("id-ID", {
        month: "short",
      });
      const monthTasks = (allTasks || []).filter((task: any) => {
        const taskDate = new Date(task.updated_at);
        return (
          taskDate.getMonth() === monthDate.getMonth() &&
          taskDate.getFullYear() === monthDate.getFullYear()
        );
      });
      const key = `${monthDate.getFullYear()}-${monthDate.getMonth()}`;
      const monthEarnings = earningsByMonthKey.get(key) || 0;

      monthlyProductivity.push({
        month: monthName,
        tasks_completed: monthTasks.filter((t: any) => t.status === "completed")
          .length,
        earnings: monthEarnings,
      });
    }

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
    console.error("🔍 DEBUG: Debug member detail API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
