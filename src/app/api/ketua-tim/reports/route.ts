// File: src/app/api/ketua-tim/reports/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface ReportData {
  report_info: {
    generated_date: string;
    period: string;
    ketua_tim_name: string;
    total_projects: number;
    total_budget: number;
  };
  projects: Array<{
    nama_project: string;
    status: string;
    tanggal_mulai: string;
    deadline: string;
    team_size: number;
    total_budget: number;
    transport_budget: number;
    honor_budget: number;
    progress: number;
  }>;
  financial_summary: {
    total_spending: number;
    transport_spending: number;
    honor_spending: number;
    budget_utilization: number;
  };
  team_summary: Array<{
    nama_lengkap: string;
    projects_assigned: number;
    tasks_completed: number;
    total_earnings: number;
  }>;
  mitra_summary: Array<{
    nama_mitra: string;
    projects_assigned: number;
    total_payments: number;
    remaining_limit: number;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = (await createClient()) as any;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "current_month";

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
      .select("role, nama_lengkap")
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
    let startDate: Date, endDate: Date;
    const now = new Date();

    switch (period) {
      case "last_month":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case "quarter":
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStart, 1);
        endDate = new Date(now.getFullYear(), quarterStart + 3, 0);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      default: // current_month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    // Get projects in the period
    const { data: projects } = await supabase
      .from("projects")
      .select(
        `
        id,
        nama_project,
        status,
        tanggal_mulai,
        deadline,
        created_at,
        project_assignments (
          assignee_type,
          uang_transport,
          honor
        )
      `,
      )
      .eq("ketua_tim_id", user.id)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString());

    // Process projects data
    const processedProjects = await Promise.all(
      (projects || []).map(
        async (project: {
          id: string;
          nama_project: string;
          status: string;
          tanggal_mulai: string;
          deadline: string;
          project_assignments: Array<{
            assignee_type: string;
            uang_transport: number | null;
            honor: number | null;
          }>;
        }) => {
          // Calculate budget
          const transportBudget = (project.project_assignments || []).reduce(
            (sum: number, assignment: { uang_transport: number | null }) =>
              sum + (assignment.uang_transport || 0),
            0,
          );

          const honorBudget = (project.project_assignments || []).reduce(
            (sum: number, assignment: { honor: number | null }) =>
              sum + (assignment.honor || 0),
            0,
          );

          const totalBudget = transportBudget + honorBudget;

          // Calculate progress
          const { data: tasks } = await supabase
            .from("tasks")
            .select("status")
            .eq("project_id", project.id);

          const totalTasks = (tasks || []).length;
          const completedTasks = (tasks || []).filter(
            (t: { status: string }) => t.status === "completed",
          ).length;
          const progress =
            totalTasks > 0
              ? Math.round((completedTasks / totalTasks) * 100)
              : 0;

          return {
            nama_project: project.nama_project,
            status: project.status,
            tanggal_mulai: project.tanggal_mulai,
            deadline: project.deadline,
            team_size: (project.project_assignments || []).length,
            total_budget: totalBudget,
            transport_budget: transportBudget,
            honor_budget: honorBudget,
            progress,
          };
        },
      ),
    );

    // Get financial summary
    const currentMonth = startDate.getMonth() + 1;
    const currentYear = startDate.getFullYear();

    const { data: financialRecords } = await supabase
      .from("financial_records")
      .select(
        `
        amount,
        recipient_type,
        projects!inner (ketua_tim_id)
      `,
      )
      .eq("projects.ketua_tim_id", user.id)
      .eq("bulan", currentMonth)
      .eq("tahun", currentYear);

    const totalSpending = (financialRecords || []).reduce(
      (sum: number, record: { amount: number }) => sum + record.amount,
      0,
    );

    const transportSpending = (financialRecords || [])
      .filter(
        (record: { recipient_type: string }) =>
          record.recipient_type === "pegawai",
      )
      .reduce(
        (sum: number, record: { amount: number }) => sum + record.amount,
        0,
      );

    const honorSpending = (financialRecords || [])
      .filter(
        (record: { recipient_type: string }) =>
          record.recipient_type === "mitra",
      )
      .reduce(
        (sum: number, record: { amount: number }) => sum + record.amount,
        0,
      );

    const totalProjectBudget = processedProjects.reduce(
      (sum: number, project: { total_budget: number }) =>
        sum + project.total_budget,
      0,
    );

    // Get team summary
    const { data: teamMembers } = await supabase
      .from("project_assignments")
      .select(
        `
        assignee_id,
        users!inner (nama_lengkap),
        projects!inner (ketua_tim_id, created_at)
      `,
      )
      .eq("assignee_type", "pegawai")
      .eq("projects.ketua_tim_id", user.id)
      .gte("projects.created_at", startDate.toISOString())
      .lte("projects.created_at", endDate.toISOString());

    const teamSummary = await Promise.all(
      Array.from(
        new Map(
          (teamMembers || []).map(
            (member: {
              assignee_id: string;
              users: { nama_lengkap: string };
            }) => [member.assignee_id, member.users.nama_lengkap],
          ),
        ).entries(),
      ).map(async ([memberId, memberName]) => {
        // Get projects assigned
        const { data: memberProjects } = await supabase
          .from("project_assignments")
          .select(
            `
            projects!inner (ketua_tim_id, created_at)
          `,
          )
          .eq("assignee_type", "pegawai")
          .eq("assignee_id", memberId)
          .eq("projects.ketua_tim_id", user.id)
          .gte("projects.created_at", startDate.toISOString())
          .lte("projects.created_at", endDate.toISOString());

        // Get tasks completed
        const { data: memberTasks } = await supabase
          .from("tasks")
          .select(
            `
            status,
            projects!inner (ketua_tim_id, created_at)
          `,
          )
          .eq("pegawai_id", memberId)
          .eq("projects.ketua_tim_id", user.id)
          .eq("status", "completed")
          .gte("projects.created_at", startDate.toISOString())
          .lte("projects.created_at", endDate.toISOString());

        // Get earnings
        const { data: memberEarnings } = await supabase
          .from("financial_records")
          .select(
            `
            amount,
            projects!inner (ketua_tim_id)
          `,
          )
          .eq("recipient_type", "pegawai")
          .eq("recipient_id", memberId)
          .eq("projects.ketua_tim_id", user.id)
          .eq("bulan", currentMonth)
          .eq("tahun", currentYear);

        const totalEarnings = (memberEarnings || []).reduce(
          (sum: number, record: { amount: number }) => sum + record.amount,
          0,
        );

        return {
          nama_lengkap: memberName as string,
          projects_assigned: (memberProjects || []).length,
          tasks_completed: (memberTasks || []).length,
          total_earnings: totalEarnings,
        };
      }),
    );

    // Get mitra summary
    const { data: mitraMembers } = await supabase
      .from("project_assignments")
      .select(
        `
        assignee_id,
        mitra!inner (nama_mitra),
        projects!inner (ketua_tim_id, created_at)
      `,
      )
      .eq("assignee_type", "mitra")
      .eq("projects.ketua_tim_id", user.id)
      .gte("projects.created_at", startDate.toISOString())
      .lte("projects.created_at", endDate.toISOString());

    const mitraSummary = await Promise.all(
      Array.from(
        new Map(
          (mitraMembers || []).map(
            (member: {
              assignee_id: string;
              mitra: { nama_mitra: string };
            }) => [member.assignee_id, member.mitra.nama_mitra],
          ),
        ).entries(),
      ).map(async ([mitraId, mitraName]) => {
        // Get projects assigned
        const { data: mitraProjects } = await supabase
          .from("project_assignments")
          .select(
            `
            projects!inner (ketua_tim_id, created_at)
          `,
          )
          .eq("assignee_type", "mitra")
          .eq("assignee_id", mitraId)
          .eq("projects.ketua_tim_id", user.id)
          .gte("projects.created_at", startDate.toISOString())
          .lte("projects.created_at", endDate.toISOString());

        // Get payments
        const { data: mitraPayments } = await supabase
          .from("financial_records")
          .select(
            `
            amount,
            projects!inner (ketua_tim_id)
          `,
          )
          .eq("recipient_type", "mitra")
          .eq("recipient_id", mitraId)
          .eq("projects.ketua_tim_id", user.id)
          .eq("bulan", currentMonth)
          .eq("tahun", currentYear);

        const totalPayments = (mitraPayments || []).reduce(
          (sum: number, record: { amount: number }) => sum + record.amount,
          0,
        );

        return {
          nama_mitra: mitraName as string,
          projects_assigned: (mitraProjects || []).length,
          total_payments: totalPayments,
          remaining_limit: 3300000 - totalPayments,
        };
      }),
    );

    const reportData: ReportData = {
      report_info: {
        generated_date: new Date().toISOString(),
        period: `${startDate.toLocaleDateString("id-ID")} - ${endDate.toLocaleDateString("id-ID")}`,
        ketua_tim_name: (userProfile as { nama_lengkap: string }).nama_lengkap,
        total_projects: processedProjects.length,
        total_budget: totalProjectBudget,
      },
      projects: processedProjects,
      financial_summary: {
        total_spending: totalSpending,
        transport_spending: transportSpending,
        honor_spending: honorSpending,
        budget_utilization:
          totalProjectBudget > 0
            ? Math.round((totalSpending / totalProjectBudget) * 100)
            : 0,
      },
      team_summary: teamSummary,
      mitra_summary: mitraSummary,
    };

    return NextResponse.json(reportData);
  } catch (error) {
    console.error("Reports API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
