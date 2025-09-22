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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createClient()) as any;
    const svc = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
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

    // Determine owned projects (accept both ketua_tim_id and leader_user_id)
    const { data: ownedProjectsRows } = await (svc as any)
      .from("projects")
      .select("id")
      .or(`ketua_tim_id.eq.${user.id},leader_user_id.eq.${user.id}`);
    const ownedIds = new Set<string>(
      (ownedProjectsRows || []).map((p: { id: string }) => p.id)
    );
    const ownedIdArray = Array.from(ownedIds);

    // Get current project assignments for accurate budget calculation (filtered by owned projects)
    const { data: currentAssignments } =
      ownedIdArray.length > 0
        ? await (svc as any)
            .from("project_assignments")
            .select("project_id, uang_transport, honor, assignee_type")
            .in("project_id", ownedIdArray)
        : { data: [] };

    // Calculate spending based on current assignments (not historical financial_records)
    const totalSpending = (currentAssignments || []).reduce(
      (
        sum: number,
        assignment: { uang_transport: number | null; honor: number | null }
      ) => sum + (assignment.uang_transport || 0) + (assignment.honor || 0),
      0
    );

    const transportSpending = (currentAssignments || [])
      .filter(
        (assignment: { assignee_type: string }) =>
          assignment.assignee_type === "pegawai"
      )
      .reduce(
        (sum: number, assignment: { uang_transport: number | null }) =>
          sum + (assignment.uang_transport || 0),
        0
      );

    const honorSpending = (currentAssignments || [])
      .filter(
        (assignment: { assignee_type: string }) =>
          assignment.assignee_type === "mitra"
      )
      .reduce(
        (sum: number, assignment: { honor: number | null }) =>
          sum + (assignment.honor || 0),
        0
      );

    // Build project budgets without relying on implicit relationship
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
    for (const a of currentAssignments as Array<{
      project_id: string;
      uang_transport: number | null;
      honor: number | null;
    }>) {
      const rec = budgetByProject.get(a.project_id) || {
        transport: 0,
        honor: 0,
      };
      rec.transport += a.uang_transport || 0;
      rec.honor += a.honor || 0;
      budgetByProject.set(a.project_id, rec);
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
      }
    );

    const totalActiveBudget = projectBudgets.reduce(
      (sum: number, project: ProjectBudget) => sum + project.total_budget,
      0
    );

    // Get spending trends (last 4 months) - using current assignments for consistency
    const spendingTrends: SpendingTrend[] = [];
    for (let i = 3; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();

      // For historical data, we'll use current assignments as proxy
      // In a real system, you might want to maintain historical snapshots
      const monthlyTransport = (currentAssignments || [])
        .filter(
          (assignment: { assignee_type: string }) =>
            assignment.assignee_type === "pegawai"
        )
        .reduce(
          (sum: number, assignment: { uang_transport: number | null }) =>
            sum + (assignment.uang_transport || 0),
          0
        );

      const monthlyHonor = (currentAssignments || [])
        .filter(
          (assignment: { assignee_type: string }) =>
            assignment.assignee_type === "mitra"
        )
        .reduce(
          (sum: number, assignment: { honor: number | null }) =>
            sum + (assignment.honor || 0),
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

    // Get top spenders from current assignments (avoid inner joins that may be blocked by RLS)
    // Aggregate Pegawai by assignee_id
    const { data: pegawaiAssignments } = await (svc as any)
      .from("project_assignments")
      .select(`uang_transport, assignee_id, project_id, assignee_type`)
      .eq("assignee_type", "pegawai");

    // Restrict to projects owned by this ketua tim
    const ownedProjectIds = new Set(ownedIdArray);

    const pegawaiTotals = (pegawaiAssignments || [])
      .filter((a: { project_id: string }) => ownedProjectIds.has(a.project_id))
      .reduce(
        (
          acc: {
            [key: string]: {
              name: string;
              amount: number;
              projects: Set<string>;
            };
          },
          assignment: {
            uang_transport: number | null;
            assignee_id: string;
            project_id: string;
          }
        ) => {
          if (!acc[assignment.assignee_id]) {
            acc[assignment.assignee_id] = {
              name: assignment.assignee_id, // temporary, will be replaced with fetched name below
              amount: 0,
              projects: new Set(),
            };
          }
          acc[assignment.assignee_id].amount += assignment.uang_transport || 0;
          acc[assignment.assignee_id].projects.add(assignment.project_id);
          return acc;
        },
        {}
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
        (a: { amount: number }, b: { amount: number }) => b.amount - a.amount
      )
      .slice(0, 5);

    // Aggregate Mitra by assignee_id
    const { data: mitraAssignments } = await (svc as any)
      .from("project_assignments")
      .select(`honor, assignee_id, project_id, assignee_type`)
      .eq("assignee_type", "mitra");

    const mitraTotals = (mitraAssignments || [])
      .filter((a: { project_id: string }) => ownedProjectIds.has(a.project_id))
      .reduce(
        (
          acc: {
            [key: string]: {
              name: string;
              amount: number;
              projects: Set<string>;
            };
          },
          assignment: {
            honor: number | null;
            assignee_id: string;
            project_id: string;
          }
        ) => {
          if (!acc[assignment.assignee_id]) {
            acc[assignment.assignee_id] = {
              name: assignment.assignee_id, // temporary, will be replaced with fetched name below
              amount: 0,
              projects: new Set(),
            };
          }
          acc[assignment.assignee_id].amount += assignment.honor || 0;
          acc[assignment.assignee_id].projects.add(assignment.project_id);
          return acc;
        },
        {}
      );

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
