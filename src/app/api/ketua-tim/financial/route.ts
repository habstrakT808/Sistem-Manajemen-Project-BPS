// File: src/app/api/ketua-tim/financial/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/../database/types/database.types";

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
    const supabase = (await createClient()) as any;
    const svc = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
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

    // Do not hard block by global role here; we enforce ownership below

    // Calculate date range based on period
    let startDate: Date;
    let endDate: Date;
    const now = new Date();

    switch (period) {
      case "last_month":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0); // Last day of last month
        break;
      case "quarter":
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStart, 1);
        endDate = new Date(now.getFullYear(), quarterStart + 3, 0); // Last day of quarter
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31); // Last day of year
        break;
      default: // current_month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of current month
    }

    const _currentMonth = startDate.getMonth() + 1;
    const _currentYear = startDate.getFullYear();

    // Determine owned projects (accept both ketua_tim_id and leader_user_id)
    const { data: ownedProjectsRows } = await (svc as any)
      .from("projects")
      .select("id")
      .or(`ketua_tim_id.eq.${user.id},leader_user_id.eq.${user.id}`);
    const ownedIds = new Set<string>(
      (ownedProjectsRows || []).map((p: { id: string }) => p.id),
    );
    const ownedIdArray = Array.from(ownedIds);

    // Get current project assignments for accurate budget calculation (filtered by owned projects)
    const { data: _currentAssignments } =
      ownedIdArray.length > 0
        ? await (svc as any)
            .from("project_assignments")
            .select("project_id, uang_transport, honor, assignee_type")
            .in("project_id", ownedIdArray)
        : { data: [] };

    // Calculate transport spending from earnings_ledger (actual transport allocations)
    // First get tasks for owned projects
    const { data: ownedTasks } =
      ownedIdArray.length > 0
        ? await (svc as any)
            .from("tasks")
            .select("id")
            .in("project_id", ownedIdArray)
        : { data: [] };

    const ownedTaskIds = (ownedTasks || []).map((t: any) => t.id);

    // Get ALL tasks with their transport/honor amounts (not just allocated ones)
    const { data: allTasksWithAmounts, error: _tasksError } =
      ownedTaskIds.length > 0
        ? await (svc as any)
            .from("tasks")
            .select(
              "id, title, pegawai_id, assignee_mitra_id, rate_per_satuan, volume, total_amount, honor_amount, transport_days",
            )
            .in("id", ownedTaskIds)
        : { data: [], error: null };

    // Calculate transport spending from tasks (both allocated and unallocated)
    const transportSpending = (allTasksWithAmounts || []).reduce(
      (sum: number, task: any) => {
        // For pegawai tasks (has pegawai_id), use total_amount (new system) or transport_days * 150000 (old system)
        if (task.pegawai_id) {
          const amount = task.total_amount || task.transport_days * 150000 || 0;
          return sum + amount;
        }
        return sum;
      },
      0,
    );

    // Calculate honor spending from tasks (both allocated and unallocated)
    const honorSpending = (allTasksWithAmounts || []).reduce(
      (sum: number, task: any) => {
        // For mitra tasks (has assignee_mitra_id), use total_amount (new system) or honor_amount (old system)
        if (task.assignee_mitra_id) {
          const amount = task.total_amount || task.honor_amount || 0;
          return sum + amount;
        }
        return sum;
      },
      0,
    );

    // Honor spending is now calculated from tasks above

    // Also get ALL financial records for debugging
    const { data: _allFinancialRecords } =
      ownedIdArray.length > 0
        ? await (svc as any)
            .from("financial_records")
            .select("*")
            .in("project_id", ownedIdArray)
        : { data: [] };

    // Honor spending is already calculated from tasks above

    // Calculate total spending from actual financial data
    const totalSpending = transportSpending + honorSpending;

    // Build project budgets from tasks instead of project_assignments
    const { data: projectRows } =
      ownedIdArray.length > 0
        ? await (svc as any)
            .from("projects")
            .select("id, nama_project, status, deadline")
            .in("id", ownedIdArray)
        : { data: [] };

    const budgetByProject = new Map<
      string,
      { transport: number; honor: number }
    >();

    if (ownedIdArray.length > 0) {
      // Get transport budget from tasks with transport
      const { data: transportTasks } = await (svc as any)
        .from("tasks")
        .select("project_id, transport_days")
        .in("project_id", ownedIdArray)
        .eq("has_transport", true);

      // Get honor budget from tasks with mitra assignments
      const { data: honorTasks } = await (svc as any)
        .from("tasks")
        .select("project_id, honor_amount")
        .in("project_id", ownedIdArray)
        .not("assignee_mitra_id", "is", null);

      // Calculate transport budget (150,000 per transport day)
      for (const task of transportTasks || []) {
        const rec = budgetByProject.get(task.project_id) || {
          transport: 0,
          honor: 0,
        };
        rec.transport += (task.transport_days || 0) * 150000;
        budgetByProject.set(task.project_id, rec);
      }

      // Calculate honor budget
      for (const task of honorTasks || []) {
        const rec = budgetByProject.get(task.project_id) || {
          transport: 0,
          honor: 0,
        };
        rec.honor += task.honor_amount || 0;
        budgetByProject.set(task.project_id, rec);
      }
    }

    const projectBudgets: ProjectBudget[] = (projectRows || []).map(
      (p: {
        id: string;
        nama_project: string;
        status: string;
        deadline: string;
      }) => {
        const b = budgetByProject.get(p.id) || { transport: 0, honor: 0 };
        const totalBudget = b.transport + b.honor;
        return {
          id: p.id,
          nama_project: p.nama_project,
          total_budget: totalBudget,
          transport_budget: b.transport,
          honor_budget: b.honor,
          status: p.status as "upcoming" | "active" | "completed",
          deadline: p.deadline,
          budget_percentage:
            totalSpending > 0
              ? Math.round((totalBudget / totalSpending) * 100)
              : 0,
        };
      },
    );

    const totalActiveBudget = projectBudgets.reduce(
      (sum: number, project: ProjectBudget) => sum + project.total_budget,
      0,
    );

    // Get spending trends (last 4 months) - using actual financial data
    const spendingTrends: SpendingTrend[] = [];
    for (let i = 3; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();

      // Get monthly transport spending from earnings_ledger
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0);

      // Get monthly transport spending from task_transport_allocations
      const { data: monthlyTransportAllocations } =
        ownedTaskIds.length > 0
          ? await (svc as any)
              .from("task_transport_allocations")
              .select("amount, allocation_date")
              .in("task_id", ownedTaskIds)
              .not("allocation_date", "is", null)
              .gte("allocation_date", monthStart.toISOString().split("T")[0])
              .lte("allocation_date", monthEnd.toISOString().split("T")[0])
          : { data: [] };

      const monthlyTransport = (monthlyTransportAllocations || []).reduce(
        (sum: number, allocation: { amount: number }) =>
          sum + allocation.amount,
        0,
      );

      // Get monthly honor spending from financial_records
      const { data: monthlyHonorRecords } =
        ownedIdArray.length > 0
          ? await (svc as any)
              .from("financial_records")
              .select("amount")
              .eq("recipient_type", "mitra")
              .eq("bulan", month)
              .eq("tahun", year)
              .in("project_id", ownedIdArray)
          : { data: [] };

      const monthlyHonor = (monthlyHonorRecords || []).reduce(
        (sum: number, record: { amount: number }) => sum + record.amount,
        0,
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

    // Get top spenders from tasks data (using the same data we already fetched)

    // Aggregate transport spending by user from tasks
    const pegawaiTotals = (allTasksWithAmounts || []).reduce(
      (
        acc: {
          [key: string]: {
            name: string;
            amount: number;
            projects: Set<string>;
          };
        },
        task: any,
      ) => {
        // Only process tasks for pegawai (has pegawai_id)
        if (!task.pegawai_id) {
          return acc;
        }

        const userId = task.pegawai_id;
        const amount = task.total_amount || task.transport_days * 150000 || 0;

        if (!acc[userId]) {
          acc[userId] = {
            name: userId, // temporary, will be replaced with fetched name below
            amount: 0,
            projects: new Set(),
          };
        }
        acc[userId].amount += amount;
        acc[userId].projects.add(task.project_id);
        return acc;
      },
      {},
    );

    // Aggregate honor spending by mitra from tasks
    const mitraTotals = (allTasksWithAmounts || []).reduce(
      (
        acc: {
          [key: string]: {
            name: string;
            amount: number;
            projects: Set<string>;
          };
        },
        task: any,
      ) => {
        // Only process tasks for mitra (has assignee_mitra_id)
        if (!task.assignee_mitra_id) {
          return acc;
        }

        const mitraId = task.assignee_mitra_id;
        const amount = task.total_amount || task.honor_amount || 0;

        if (!acc[mitraId]) {
          acc[mitraId] = {
            name: mitraId, // temporary, will be replaced with fetched name below
            amount: 0,
            projects: new Set(),
          };
        }
        acc[mitraId].amount += amount;
        acc[mitraId].projects.add(task.project_id);
        return acc;
      },
      {},
    );

    // Try to resolve pegawai names in batch; fallback to masked id if RLS blocks
    const pegawaiIds = Object.keys(pegawaiTotals);
    let pegawaiNames: Record<string, string> = {};
    if (pegawaiIds.length > 0) {
      const { data: usersRows } = await (svc as any)
        .from("users")
        .select("id, nama_lengkap")
        .in("id", pegawaiIds);
      for (const row of usersRows || []) {
        pegawaiNames[(row as { id: string }).id] = (
          row as { nama_lengkap: string }
        ).nama_lengkap;
      }
    }
    for (const [id, rec] of Object.entries(pegawaiTotals)) {
      const r = rec as { name?: string };
      if (pegawaiNames[id]) r.name = pegawaiNames[id];
      else r.name = `User ${id.slice(0, 6)}`;
    }

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
        (a: { amount: number }, b: { amount: number }) => b.amount - a.amount,
      )
      .slice(0, 5);

    // Get honor spending by mitra from financial_records
    const { data: _allHonorRecords } =
      ownedIdArray.length > 0
        ? await (svc as any)
            .from("financial_records")
            .select("recipient_id, amount, project_id, bulan, tahun")
            .eq("recipient_type", "mitra")
            .in("project_id", ownedIdArray)
            .gte("tahun", startDate.getFullYear())
            .lte("tahun", endDate.getFullYear())
        : { data: [] };

    // mitraTotals is already calculated from tasks above

    // Resolve mitra names in batch; mitra likely public/visible via RLS
    const mitraIds = Object.keys(mitraTotals);
    let mitraNames: Record<string, string> = {};
    if (mitraIds.length > 0) {
      const { data: mitraRows } = await (svc as any)
        .from("mitra")
        .select("id, nama_mitra")
        .in("id", mitraIds);
      for (const row of mitraRows || []) {
        mitraNames[(row as { id: string }).id] = (
          row as { nama_mitra: string }
        ).nama_mitra;
      }
    }
    for (const [id, rec] of Object.entries(mitraTotals)) {
      const r = rec as { name?: string };
      if (mitraNames[id]) r.name = mitraNames[id];
      else r.name = `Mitra ${id.slice(0, 6)}`;
    }

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
        (a: { amount: number }, b: { amount: number }) => b.amount - a.amount,
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
      { status: 500 },
    );
  }
}
