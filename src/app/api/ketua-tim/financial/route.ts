// File: src/app/api/ketua-tim/financial/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface FinancialStats {
  total_monthly_spending: number;
  transport_spending: number;
  honor_spending: number;
  active_projects_budget: number;
  budget_utilization: number;
  projects_with_budget: number;
}

interface ProjectBudget {
  id: string;
  nama_project: string;
  total_budget: number;
  transport_budget: number;
  honor_budget: number;
  status: "upcoming" | "active" | "completed";
  deadline: string;
  budget_percentage: number;
}

interface SpendingTrend {
  month: string;
  transport: number;
  honor: number;
  total: number;
}

export async function GET(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    // Calculate date range based on period
    let startDate: Date;
    const now = new Date();

    switch (period) {
      case "last_month":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        break;
      case "quarter":
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStart, 1);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default: // current_month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const currentMonth = startDate.getMonth() + 1;
    const currentYear = startDate.getFullYear();

    // Get financial statistics
    const { data: financialRecords } = await supabase
      .from("financial_records")
      .select(
        `
        amount,
        recipient_type,
        bulan,
        tahun,
        projects!inner (ketua_tim_id)
      `
      )
      .eq("projects.ketua_tim_id", user.id)
      .eq("bulan", currentMonth)
      .eq("tahun", currentYear);

    const totalSpending = (financialRecords || []).reduce(
      (sum: number, record: { amount: number }) => sum + record.amount,
      0
    );

    const transportSpending = (financialRecords || [])
      .filter(
        (record: { recipient_type: string }) =>
          record.recipient_type === "pegawai"
      )
      .reduce(
        (sum: number, record: { amount: number }) => sum + record.amount,
        0
      );

    const honorSpending = (financialRecords || [])
      .filter(
        (record: { recipient_type: string }) =>
          record.recipient_type === "mitra"
      )
      .reduce(
        (sum: number, record: { amount: number }) => sum + record.amount,
        0
      );

    // Get active projects with budget calculation
    const { data: activeProjects } = await supabase
      .from("projects")
      .select(
        `
        id,
        nama_project,
        status,
        deadline,
        project_assignments (
          uang_transport,
          honor
        )
      `
      )
      .eq("ketua_tim_id", user.id)
      .in("status", ["upcoming", "active"]);

    const projectBudgets: ProjectBudget[] = (activeProjects || []).map(
      (project: {
        id: string;
        nama_project: string;
        status: string;
        deadline: string;
        project_assignments: Array<{
          uang_transport: number | null;
          honor: number | null;
        }>;
      }) => {
        const transportBudget = (project.project_assignments || []).reduce(
          (sum: number, assignment: { uang_transport: number | null }) =>
            sum + (assignment.uang_transport || 0),
          0
        );

        const honorBudget = (project.project_assignments || []).reduce(
          (sum: number, assignment: { honor: number | null }) =>
            sum + (assignment.honor || 0),
          0
        );

        const totalBudget = transportBudget + honorBudget;

        return {
          id: project.id,
          nama_project: project.nama_project,
          total_budget: totalBudget,
          transport_budget: transportBudget,
          honor_budget: honorBudget,
          status: project.status as "upcoming" | "active" | "completed",
          deadline: project.deadline,
          budget_percentage:
            totalSpending > 0
              ? Math.round((totalBudget / totalSpending) * 100)
              : 0,
        };
      }
    );

    const totalActiveBudget = projectBudgets.reduce(
      (sum: number, project: ProjectBudget) => sum + project.total_budget,
      0
    );

    // Get spending trends (last 4 months)
    const spendingTrends: SpendingTrend[] = [];
    for (let i = 3; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();

      const { data: monthlyRecords } = await supabase
        .from("financial_records")
        .select(
          `
          amount,
          recipient_type,
          projects!inner (ketua_tim_id)
        `
        )
        .eq("projects.ketua_tim_id", user.id)
        .eq("bulan", month)
        .eq("tahun", year);

      const monthlyTransport = (monthlyRecords || [])
        .filter(
          (record: { recipient_type: string }) =>
            record.recipient_type === "pegawai"
        )
        .reduce(
          (sum: number, record: { amount: number }) => sum + record.amount,
          0
        );

      const monthlyHonor = (monthlyRecords || [])
        .filter(
          (record: { recipient_type: string }) =>
            record.recipient_type === "mitra"
        )
        .reduce(
          (sum: number, record: { amount: number }) => sum + record.amount,
          0
        );

      spendingTrends.push({
        month: date.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        }),
        transport: monthlyTransport,
        honor: monthlyHonor,
        total: monthlyTransport + monthlyHonor,
      });
    }

    // Get top spenders
    // Top Pegawai
    const { data: pegawaiSpending } = await supabase
      .from("financial_records")
      .select(
        `
        amount,
        recipient_id,
        users!inner (nama_lengkap),
        projects!inner (ketua_tim_id)
      `
      )
      .eq("recipient_type", "pegawai")
      .eq("projects.ketua_tim_id", user.id)
      .eq("bulan", currentMonth)
      .eq("tahun", currentYear);

    const pegawaiTotals = (pegawaiSpending || []).reduce(
      (
        acc: {
          [key: string]: {
            name: string;
            amount: number;
            projects: Set<string>;
          };
        },
        record: {
          amount: number;
          recipient_id: string;
          users: { nama_lengkap: string };
          projects: { id: string };
        }
      ) => {
        if (!acc[record.recipient_id]) {
          acc[record.recipient_id] = {
            name: record.users.nama_lengkap,
            amount: 0,
            projects: new Set(),
          };
        }
        acc[record.recipient_id].amount += record.amount;
        acc[record.recipient_id].projects.add(record.projects.id);
        return acc;
      },
      {}
    );

    const topPegawai = Object.values(pegawaiTotals)
      .map((p) => {
        const pegawai = p as {
          name: string;
          amount: number;
          projects: Set<string>;
        };
        return {
          name: pegawai.name,
          amount: pegawai.amount,
          projects: pegawai.projects.size,
        };
      })
      .sort(
        (a: { amount: number }, b: { amount: number }) => b.amount - a.amount
      )
      .slice(0, 5);

    // Top Mitra
    const { data: mitraSpending } = await supabase
      .from("financial_records")
      .select(
        `
        amount,
        recipient_id,
        mitra!inner (nama_mitra),
        projects!inner (ketua_tim_id)
      `
      )
      .eq("recipient_type", "mitra")
      .eq("projects.ketua_tim_id", user.id)
      .eq("bulan", currentMonth)
      .eq("tahun", currentYear);

    const mitraTotals = (mitraSpending || []).reduce(
      (
        acc: {
          [key: string]: {
            name: string;
            amount: number;
            projects: Set<string>;
          };
        },
        record: {
          amount: number;
          recipient_id: string;
          mitra: { nama_mitra: string };
          projects: { id: string };
        }
      ) => {
        if (!acc[record.recipient_id]) {
          acc[record.recipient_id] = {
            name: record.mitra.nama_mitra,
            amount: 0,
            projects: new Set(),
          };
        }
        acc[record.recipient_id].amount += record.amount;
        acc[record.recipient_id].projects.add(record.projects.id);
        return acc;
      },
      {}
    );

    const topMitra = Object.values(mitraTotals)
      .map((m) => {
        const mitra = m as {
          name: string;
          amount: number;
          projects: Set<string>;
        };
        return {
          name: mitra.name,
          amount: mitra.amount,
          projects: mitra.projects.size,
          remaining_limit: 3300000 - mitra.amount,
        };
      })
      .sort(
        (a: { amount: number }, b: { amount: number }) => b.amount - a.amount
      )
      .slice(0, 5);

    const stats: FinancialStats = {
      total_monthly_spending: totalSpending,
      transport_spending: transportSpending,
      honor_spending: honorSpending,
      active_projects_budget: totalActiveBudget,
      budget_utilization:
        totalActiveBudget > 0
          ? Math.round((totalSpending / totalActiveBudget) * 100)
          : 0,
      projects_with_budget: projectBudgets.filter((p) => p.total_budget > 0)
        .length,
    };

    return NextResponse.json({
      stats,
      project_budgets: projectBudgets
        .sort((a, b) => b.total_budget - a.total_budget)
        .slice(0, 10),
      spending_trends: spendingTrends,
      top_spenders: {
        pegawai: topPegawai,
        mitra: topMitra,
      },
    });
  } catch (error) {
    console.error("Financial API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
