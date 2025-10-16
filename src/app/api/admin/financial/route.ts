import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/../database/types/database.types";

export async function GET(request: NextRequest) {
  try {
    const supabase = (await createClient()) as any;
    const svc = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { searchParams } = new URL(request.url);

    const period = searchParams.get("period") || "current_month";
    const pegawaiId = searchParams.get("pegawai_id");
    const mitraId = searchParams.get("mitra_id");
    const projectId = searchParams.get("project_id");
    const teamId = searchParams.get("team_id");
    const type = searchParams.get("type") || "all"; // all, pegawai, mitra

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 403 },
      );
    }

    if (userProfile.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 },
      );
    }

    // Calculate date range based on period
    const now = new Date();
    let startDate: string;
    let endDate: string;

    switch (period) {
      case "current_month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString()
          .split("T")[0];
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
          .toISOString()
          .split("T")[0];
        break;
      case "last_month":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          .toISOString()
          .split("T")[0];
        endDate = new Date(now.getFullYear(), now.getMonth(), 0)
          .toISOString()
          .split("T")[0];
        break;
      case "current_year":
        startDate = new Date(now.getFullYear(), 0, 1)
          .toISOString()
          .split("T")[0];
        endDate = new Date(now.getFullYear(), 11, 31)
          .toISOString()
          .split("T")[0];
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString()
          .split("T")[0];
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
          .toISOString()
          .split("T")[0];
    }

    // Build filter conditions
    let taskFilter: any = {};
    if (pegawaiId) taskFilter.pegawai_id = pegawaiId;
    if (mitraId) taskFilter.assignee_mitra_id = mitraId;
    if (projectId) taskFilter.project_id = projectId;

    // Get all tasks with amounts (global access)
    const { data: allTasksWithAmounts, error: tasksError } = await (svc as any)
      .from("tasks")
      .select(
        "id, title, pegawai_id, assignee_mitra_id, rate_per_satuan, volume, total_amount, honor_amount, transport_days, project_id",
      )
      .match(taskFilter);

    if (tasksError) throw tasksError;

    // Filter by type
    let filteredTasks = allTasksWithAmounts || [];
    if (type === "pegawai") {
      filteredTasks = filteredTasks.filter((task: any) => task.pegawai_id);
    } else if (type === "mitra") {
      filteredTasks = filteredTasks.filter(
        (task: any) => task.assignee_mitra_id,
      );
    }

    // Calculate transport spending from tasks
    const transportSpending = filteredTasks.reduce((sum: number, task: any) => {
      if (task.pegawai_id) {
        const amount = task.total_amount || task.transport_days * 150000 || 0;
        return sum + amount;
      }
      return sum;
    }, 0);

    // Calculate honor spending from tasks
    const honorSpending = filteredTasks.reduce((sum: number, task: any) => {
      if (task.assignee_mitra_id) {
        const amount = task.total_amount || task.honor_amount || 0;
        return sum + amount;
      }
      return sum;
    }, 0);

    // Get monthly budget (sum of all project budgets)
    const { data: allProjects } = await (svc as any)
      .from("projects")
      .select("budget_transport, budget_honor");

    const monthlyBudget = (allProjects || []).reduce(
      (sum: number, project: any) => {
        const transport = project.budget_transport || 0;
        const honor = project.budget_honor || 0;
        return sum + transport + honor;
      },
      0,
    );

    // Get top spenders (global)
    const pegawaiTotals = filteredTasks.reduce(
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
        if (!task.pegawai_id) return acc;

        const userId = task.pegawai_id;
        const amount = task.total_amount || task.transport_days * 150000 || 0;

        if (!acc[userId]) {
          acc[userId] = {
            name: userId, // temporary, will be replaced with fetched name
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

    const mitraTotals = filteredTasks.reduce(
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
        if (!task.assignee_mitra_id) return acc;

        const mitraId = task.assignee_mitra_id;
        const amount = task.total_amount || task.honor_amount || 0;

        if (!acc[mitraId]) {
          acc[mitraId] = {
            name: mitraId, // temporary, will be replaced with fetched name
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

    // Get user names for top spenders
    const allUserIds = [
      ...Object.keys(pegawaiTotals),
      ...Object.keys(mitraTotals),
    ];
    let userNames: Record<string, string> = {};
    let mitraNames: Record<string, string> = {};

    if (allUserIds.length > 0) {
      // Get pegawai names
      const pegawaiIds = Object.keys(pegawaiTotals);
      if (pegawaiIds.length > 0) {
        const { data: usersRows } = await (svc as any)
          .from("users")
          .select("id, nama_lengkap")
          .in("id", pegawaiIds);

        userNames = (usersRows || []).reduce(
          (acc: Record<string, string>, user: any) => {
            acc[user.id] = user.nama_lengkap;
            return acc;
          },
          {},
        );
      }

      // Get mitra names
      const mitraIds = Object.keys(mitraTotals);
      if (mitraIds.length > 0) {
        const { data: mitraRows } = await (svc as any)
          .from("mitra")
          .select("id, nama_mitra")
          .in("id", mitraIds);

        mitraNames = (mitraRows || []).reduce(
          (acc: Record<string, string>, mitra: any) => {
            acc[mitra.id] = mitra.nama_mitra;
            return acc;
          },
          {},
        );
      }
    }

    // Update names in totals
    Object.keys(pegawaiTotals).forEach((userId) => {
      pegawaiTotals[userId].name =
        userNames[userId] || `Pegawai ${userId.slice(0, 6)}`;
    });

    Object.keys(mitraTotals).forEach((mitraId) => {
      mitraTotals[mitraId].name =
        mitraNames[mitraId] || `Mitra ${mitraId.slice(0, 6)}`;
    });

    // Sort and get top 5
    const topSpenders = [
      ...Object.values(pegawaiTotals),
      ...Object.values(mitraTotals),
    ]
      .sort((a: any, b: any) => b.amount - a.amount)
      .slice(0, 5);

    return NextResponse.json({
      period,
      transportSpending,
      honorSpending,
      totalSpending: transportSpending + honorSpending,
      monthlyBudget,
      topSpenders,
      filters: {
        pegawaiId,
        mitraId,
        projectId,
        teamId,
        type,
      },
    });
  } catch (error) {
    console.error("Admin financial API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
