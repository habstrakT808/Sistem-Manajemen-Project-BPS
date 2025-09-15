// File: src/app/api/pegawai/earnings/analytics/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

interface EarningsRecord {
  id: string;
  amount: number;
  description: string;
  created_at: string;
  bulan: number;
  tahun: number;
  projects: {
    id: string;
    nama_project: string;
    tanggal_mulai: string;
    deadline: string;
    status: "upcoming" | "active" | "completed";
  };
}

interface FinancialRecordRow {
  id: string;
  amount: number;
  description: string | null;
  created_at: string;
  bulan: number;
  tahun: number;
  project_id: string;
}

interface MonthlyEarnings {
  month: number;
  year: number;
  month_name: string;
  total: number;
  project_count: number;
  records: EarningsRecord[];
}

interface EarningsAnalytics {
  total_earnings: number;
  total_projects: number;
  average_per_project: number;
  best_month: {
    month_name: string;
    amount: number;
  };
  growth_percentage: number;
  monthly_average: number;
  current_month_rank: number;
  projected_annual: number;
}

interface ProjectContribution {
  project_name: string;
  amount: number;
  percentage: number;
  project_count: number;
  status: string;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const period = searchParams.get("period") || "monthly";
    const year = parseInt(
      searchParams.get("year") || new Date().getFullYear().toString()
    );
    const month = parseInt(
      searchParams.get("month") || (new Date().getMonth() + 1).toString()
    );

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
      (userProfile as { role: string }).role !== "pegawai"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Use service client to bypass RLS and avoid join ambiguity
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get current period financial records (no joins)
    let currentFilter = serviceClient
      .from("financial_records")
      .select("id, amount, description, created_at, bulan, tahun, project_id")
      .eq("recipient_type", "pegawai")
      .eq("recipient_id", user.id)
      .eq("tahun", year);

    if (period === "monthly") {
      currentFilter = currentFilter.eq("bulan", month);
    }

    const { data: currentRows, error: currentError } =
      await currentFilter.order("created_at", { ascending: false });

    if (currentError) {
      throw currentError;
    }

    const currentRowsTyped: FinancialRecordRow[] = (currentRows ||
      []) as FinancialRecordRow[];

    // Load projects for current rows
    const currentProjectIds = Array.from(
      new Set(currentRowsTyped.map((r) => r.project_id))
    );

    const { data: currentProjects } = await serviceClient
      .from("projects")
      .select("id, nama_project, tanggal_mulai, deadline, status")
      .in(
        "id",
        currentProjectIds.length > 0
          ? currentProjectIds
          : ["00000000-0000-0000-0000-000000000000"]
      );

    const projectMap = new Map((currentProjects || []).map((p) => [p.id, p]));

    const currentRecordsTyped: EarningsRecord[] = currentRowsTyped.map((r) => ({
      id: r.id,
      amount: r.amount,
      description: r.description ?? "",
      created_at: r.created_at,
      bulan: r.bulan,
      tahun: r.tahun,
      projects: projectMap.get(r.project_id) as EarningsRecord["projects"],
    }));

    // Calculate current period totals
    const currentTotal = currentRecordsTyped.reduce(
      (sum: number, record: EarningsRecord) => sum + record.amount,
      0
    );

    const currentPeriodData: MonthlyEarnings = {
      month,
      year,
      month_name: new Date(year, month - 1).toLocaleDateString("id-ID", {
        month: "long",
        year: "numeric",
      }),
      total: currentTotal,
      project_count: new Set(
        currentRecordsTyped.map((r: EarningsRecord) => r.projects.id)
      ).size,
      records: currentRecordsTyped,
    };

    // Get historical data (last 12 months)
    const historicalData: MonthlyEarnings[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const histMonth = date.getMonth() + 1;
      const histYear = date.getFullYear();

      const { data: histRows } = await serviceClient
        .from("financial_records")
        .select("id, amount, description, created_at, bulan, tahun, project_id")
        .eq("recipient_type", "pegawai")
        .eq("recipient_id", user.id)
        .eq("bulan", histMonth)
        .eq("tahun", histYear)
        .order("created_at", { ascending: false });

      const histRowsTyped: FinancialRecordRow[] = (histRows ||
        []) as FinancialRecordRow[];
      const histProjectIds = Array.from(
        new Set(histRowsTyped.map((r) => r.project_id))
      );
      const { data: histProjects } = await serviceClient
        .from("projects")
        .select("id, nama_project, tanggal_mulai, deadline, status")
        .in(
          "id",
          histProjectIds.length > 0
            ? histProjectIds
            : ["00000000-0000-0000-0000-000000000000"]
        );
      const histProjectMap = new Map(
        (histProjects || []).map((p) => [p.id, p])
      );

      const histRecordsTyped: EarningsRecord[] = histRowsTyped.map((r) => ({
        id: r.id,
        amount: r.amount,
        description: r.description ?? "",
        created_at: r.created_at,
        bulan: r.bulan,
        tahun: r.tahun,
        projects: histProjectMap.get(
          r.project_id
        ) as EarningsRecord["projects"],
      }));
      const monthTotal = histRecordsTyped.reduce(
        (sum: number, record: EarningsRecord) => sum + record.amount,
        0
      );

      const projectCount = new Set(
        histRecordsTyped.map((r: EarningsRecord) => r.projects.id)
      ).size;

      historicalData.push({
        month: histMonth,
        year: histYear,
        month_name: date.toLocaleDateString("id-ID", {
          month: "long",
          year: "numeric",
        }),
        total: monthTotal,
        project_count: projectCount,
        records: histRecordsTyped,
      });
    }

    // Calculate analytics
    const totalEarnings = historicalData.reduce(
      (sum, item) => sum + item.total,
      0
    );
    const totalProjects = new Set(
      historicalData.flatMap((item) =>
        item.records.map((r: EarningsRecord) => r.projects.id)
      )
    ).size;
    const averagePerProject =
      totalProjects > 0 ? totalEarnings / totalProjects : 0;

    const bestMonth = historicalData.reduce(
      (best, current) => (current.total > best.total ? current : best),
      { month_name: "N/A", total: 0 }
    );

    // Calculate growth percentage (current vs previous period)
    const previousPeriodIndex = period === "monthly" ? 1 : 12;
    const previousPeriod =
      historicalData[historicalData.length - 1 - previousPeriodIndex];
    const growthPercentage =
      previousPeriod && previousPeriod.total > 0
        ? ((currentTotal - previousPeriod.total) / previousPeriod.total) * 100
        : 0;

    const monthlyAverage =
      historicalData.length > 0
        ? totalEarnings / historicalData.filter((h) => h.total > 0).length
        : 0;

    // Calculate current month rank
    const sortedMonths = [...historicalData].sort((a, b) => b.total - a.total);
    const currentMonthRank =
      sortedMonths.findIndex((m) => m.month === month && m.year === year) + 1;

    // Project annual earnings based on current monthly average
    const projectedAnnual = monthlyAverage * 12;

    const analytics: EarningsAnalytics = {
      total_earnings: totalEarnings,
      total_projects: totalProjects,
      average_per_project: averagePerProject,
      best_month: {
        month_name: bestMonth.month_name,
        amount: bestMonth.total,
      },
      growth_percentage: growthPercentage,
      monthly_average: monthlyAverage,
      current_month_rank: currentMonthRank || historicalData.length,
      projected_annual: projectedAnnual,
    };

    // Calculate project contributions
    const projectContributions: {
      [key: string]: {
        amount: number;
        count: number;
        status: string;
        name: string;
      };
    } = {};

    historicalData.forEach((monthData) => {
      monthData.records.forEach((record: EarningsRecord) => {
        const projectId = record.projects.id;
        if (!projectContributions[projectId]) {
          projectContributions[projectId] = {
            amount: 0,
            count: 0,
            status: record.projects.status,
            name: record.projects.nama_project,
          };
        }
        projectContributions[projectId].amount += record.amount;
        projectContributions[projectId].count += 1;
      });
    });

    const projectContributionsList: ProjectContribution[] = Object.values(
      projectContributions
    )
      .map((contrib) => ({
        project_name: contrib.name,
        amount: contrib.amount,
        percentage:
          totalEarnings > 0 ? (contrib.amount / totalEarnings) * 100 : 0,
        project_count: contrib.count,
        status: contrib.status,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10); // Top 10 projects

    // Calculate yearly summary
    const currentYearRecords = historicalData.filter((h) => h.year === year);
    const yearlyTotal = currentYearRecords.reduce(
      (sum, item) => sum + item.total,
      0
    );
    const activeMonths = currentYearRecords.filter((h) => h.total > 0).length;
    const projectsCompleted = new Set(
      currentYearRecords.flatMap((item) =>
        item.records
          .filter((r: EarningsRecord) => r.projects.status === "completed")
          .map((r: EarningsRecord) => r.projects.id)
      )
    ).size;

    const yearlyData = {
      year,
      total: yearlyTotal,
      months_active: activeMonths,
      projects_completed: projectsCompleted,
    };

    return NextResponse.json({
      current_period: currentPeriodData,
      historical_data: historicalData,
      analytics,
      project_contributions: projectContributionsList,
      yearly_summary: yearlyData,
    });
  } catch (error) {
    console.error("Earnings Analytics API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
