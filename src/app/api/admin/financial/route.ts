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
    const pegawaiId =
      searchParams.get("pegawaiId") || searchParams.get("pegawai_id");
    const mitraId = searchParams.get("mitraId") || searchParams.get("mitra_id");
    const projectId =
      searchParams.get("projectId") || searchParams.get("project_id");
    const teamId = searchParams.get("teamId") || searchParams.get("team_id");
    const type = searchParams.get("type") || "all"; // all, pegawai, mitra

    // Date filters
    const yearParam = searchParams.get("year");
    const monthParam = searchParams.get("month");
    const dayParam = searchParams.get("day");

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

    // Calculate date range based on period or date filters
    const now = new Date();
    let startDate: string;
    let endDate: string;

    // If date filters are provided, use them instead of period
    if (yearParam && yearParam !== "all") {
      const year = parseInt(yearParam);

      if (monthParam && monthParam !== "all") {
        const month = parseInt(monthParam);

        if (dayParam && dayParam !== "all") {
          // Specific day - build manually to avoid timezone issues
          const day = parseInt(dayParam);
          const monthStr = month.toString().padStart(2, "0");
          const dayStr = day.toString().padStart(2, "0");
          startDate = `${year}-${monthStr}-${dayStr}`;
          endDate = startDate;
        } else {
          // Specific month, all days - build manually to avoid timezone issues
          const monthStr = month.toString().padStart(2, "0");
          startDate = `${year}-${monthStr}-01`;
          const lastDay = new Date(year, month, 0).getDate();
          endDate = `${year}-${monthStr}-${lastDay.toString().padStart(2, "0")}`;
        }
      } else {
        // Specific year, all months - build manually
        startDate = `${year}-01-01`;
        endDate = `${year}-12-31`;
      }
    } else if (yearParam === "all") {
      // All years - get everything from database beginning to now
      startDate = "2020-01-01";
      const currentYear = now.getFullYear();
      endDate = `${currentYear}-12-31`;
    } else {
      // Use period-based filtering - build manually to avoid timezone issues
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1; // getMonth() is 0-indexed

      switch (period) {
        case "current_month":
          const currentMonthStr = currentMonth.toString().padStart(2, "0");
          startDate = `${currentYear}-${currentMonthStr}-01`;
          const lastDayCurrentMonth = new Date(
            currentYear,
            currentMonth,
            0,
          ).getDate();
          endDate = `${currentYear}-${currentMonthStr}-${lastDayCurrentMonth.toString().padStart(2, "0")}`;
          break;
        case "last_month":
          const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
          const lastMonthYear =
            currentMonth === 1 ? currentYear - 1 : currentYear;
          const lastMonthStr = lastMonth.toString().padStart(2, "0");
          startDate = `${lastMonthYear}-${lastMonthStr}-01`;
          const lastDayLastMonth = new Date(
            lastMonthYear,
            lastMonth,
            0,
          ).getDate();
          endDate = `${lastMonthYear}-${lastMonthStr}-${lastDayLastMonth.toString().padStart(2, "0")}`;
          break;
        case "current_year":
          startDate = `${currentYear}-01-01`;
          endDate = `${currentYear}-12-31`;
          break;
        default:
          const defaultMonthStr = currentMonth.toString().padStart(2, "0");
          startDate = `${currentYear}-${defaultMonthStr}-01`;
          const lastDayDefaultMonth = new Date(
            currentYear,
            currentMonth,
            0,
          ).getDate();
          endDate = `${currentYear}-${defaultMonthStr}-${lastDayDefaultMonth.toString().padStart(2, "0")}`;
      }
    }

    // Build filter conditions
    let taskFilter: any = {};
    if (pegawaiId) taskFilter.pegawai_id = pegawaiId;
    if (mitraId) taskFilter.assignee_mitra_id = mitraId;
    if (projectId) taskFilter.project_id = projectId;

    // Get all tasks with amounts (global access) and filter by date
    let tasksQuery = (svc as any)
      .from("tasks")
      .select(
        "id, title, pegawai_id, assignee_mitra_id, rate_per_satuan, volume, total_amount, honor_amount, transport_days, project_id, start_date, end_date",
      )
      .match(taskFilter);

    // Apply date filtering to tasks
    tasksQuery = tasksQuery
      .gte("start_date", startDate)
      .lte("start_date", endDate);

    const { data: allTasksWithAmounts, error: tasksError } = await tasksQuery;

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

    // Calculate transport spending from task_transport_allocations (not from tasks)
    // This ensures we count actual allocations, not just task estimates
    let transportAllocationsQuery = (svc as any)
      .from("task_transport_allocations")
      .select(
        `
        amount,
        tasks!inner(start_date)
      `,
      )
      .is("canceled_at", null);

    // Apply date filter based on task start_date
    if (
      yearParam &&
      yearParam !== "all" &&
      monthParam &&
      monthParam !== "all"
    ) {
      const year = parseInt(yearParam);
      const month = parseInt(monthParam);
      const monthStr = month.toString().padStart(2, "0");
      const statsMonthStart = `${year}-${monthStr}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const statsMonthEnd = `${year}-${monthStr}-${lastDay.toString().padStart(2, "0")}`;

      transportAllocationsQuery = transportAllocationsQuery
        .gte("tasks.start_date", statsMonthStart)
        .lte("tasks.start_date", statsMonthEnd);
    } else {
      transportAllocationsQuery = transportAllocationsQuery
        .gte("tasks.start_date", startDate)
        .lte("tasks.start_date", endDate);
    }

    // Apply entity filters
    if (pegawaiId) {
      transportAllocationsQuery = transportAllocationsQuery.eq(
        "user_id",
        pegawaiId,
      );
    }

    const { data: transportAllocations, error: transportError } =
      await transportAllocationsQuery;

    if (transportError) {
      console.error("Transport allocations error for stats:", transportError);
    }

    const transportSpending = (transportAllocations || []).reduce(
      (sum: number, allocation: any) => sum + (allocation.amount || 0),
      0,
    );

    // Calculate honor spending from tasks
    const honorSpending = filteredTasks.reduce((sum: number, task: any) => {
      if (task.assignee_mitra_id) {
        const amount = task.total_amount || task.honor_amount || 0;
        return sum + amount;
      }
      return sum;
    }, 0);

    // Calculate monthly budget from all task allocations (both actual and planned)
    // Since projects table doesn't have budget fields, we calculate from tasks
    const { data: allTasksForBudget, error: budgetTasksError } = await (
      svc as any
    )
      .from("tasks")
      .select("total_amount, honor_amount, pegawai_id, assignee_mitra_id");

    if (budgetTasksError) {
      console.error("Budget tasks query error:", budgetTasksError);
    }

    // Calculate total budget from all tasks (not filtered by date - this is total budget available)
    const monthlyBudget = (allTasksForBudget || []).reduce(
      (sum: number, task: any) => {
        if (task.pegawai_id) {
          // Transport for pegawai
          return sum + (task.total_amount || 0);
        } else if (task.assignee_mitra_id) {
          // Honor for mitra
          return sum + (task.total_amount || task.honor_amount || 0);
        }
        return sum;
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

    // Get detailed transactions for Overview tab
    // Query task_transport_allocations with date filtering
    let allocationsQuery = (svc as any)
      .from("task_transport_allocations")
      .select(
        `
        id,
        amount,
        user_id,
        created_at,
        task_id,
        tasks!inner(
          id,
          title,
          start_date,
          project_id
        )
      `,
      )
      .is("canceled_at", null);

    // Apply date filtering based on task start_date (not allocation created_at)
    // Only apply date filter if BOTH year and month are specific (not "all")
    if (
      yearParam &&
      yearParam !== "all" &&
      monthParam &&
      monthParam !== "all"
    ) {
      const year = parseInt(yearParam);
      const month = parseInt(monthParam);

      if (dayParam && dayParam !== "all") {
        // Specific day - filter by task start_date
        const day = parseInt(dayParam);
        const dayDate = new Date(year, month - 1, day)
          .toISOString()
          .split("T")[0];
        allocationsQuery = allocationsQuery
          .gte("tasks.start_date", dayDate)
          .lte("tasks.start_date", dayDate);
      } else {
        // Specific month - filter by task start_date
        // Build date strings manually to avoid timezone issues
        const monthStr = month.toString().padStart(2, "0");
        const monthStart = `${year}-${monthStr}-01`;

        // Get last day of month
        const lastDay = new Date(year, month, 0).getDate();
        const monthEnd = `${year}-${monthStr}-${lastDay.toString().padStart(2, "0")}`;

        allocationsQuery = allocationsQuery
          .gte("tasks.start_date", monthStart)
          .lte("tasks.start_date", monthEnd);
      }
    } else {
    }
    // If month is "all" or year is "all" - no date filtering at all

    // Apply entity filters
    if (pegawaiId) {
      allocationsQuery = allocationsQuery.eq("user_id", pegawaiId);
    }
    if (projectId) {
      allocationsQuery = allocationsQuery.eq("tasks.project_id", projectId);
    }

    const { data: allocations, error: allocationsError } =
      await allocationsQuery;

    if (allocationsError) {
      console.error("Allocations query error:", allocationsError);
    }

    // Get mitra honor data from tasks
    let mitraTasksQuery = (svc as any)
      .from("tasks")
      .select(
        `
        id,
        title,
        assignee_mitra_id,
        total_amount,
        honor_amount,
        start_date,
        project_id,
        volume,
        rate_per_satuan
      `,
      )
      .not("assignee_mitra_id", "is", null);

    // Apply date filtering - consistent with allocations
    // Only apply date filter if BOTH year and month are specific (not "all")
    if (
      yearParam &&
      yearParam !== "all" &&
      monthParam &&
      monthParam !== "all"
    ) {
      const year = parseInt(yearParam);
      const month = parseInt(monthParam);

      if (dayParam && dayParam !== "all") {
        // Specific day
        const day = parseInt(dayParam);
        const dayDate = new Date(year, month - 1, day)
          .toISOString()
          .split("T")[0];
        mitraTasksQuery = mitraTasksQuery
          .gte("start_date", dayDate)
          .lte("start_date", dayDate);
      } else {
        // Specific month - build date strings manually to avoid timezone issues
        const monthStr = month.toString().padStart(2, "0");
        const monthStart = `${year}-${monthStr}-01`;

        // Get last day of month
        const lastDay = new Date(year, month, 0).getDate();
        const monthEnd = `${year}-${monthStr}-${lastDay.toString().padStart(2, "0")}`;

        mitraTasksQuery = mitraTasksQuery
          .gte("start_date", monthStart)
          .lte("start_date", monthEnd);
        console.log(
          `📆 Filtering mitra tasks by start_date: ${monthStart} to ${monthEnd}`,
        );
      }
    } else {
      console.log(
        "📆 No date filtering applied for mitra tasks - showing all data",
      );
    }
    // If month is "all" or year is "all" - no date filtering at all

    // Apply entity filters
    if (mitraId) {
      mitraTasksQuery = mitraTasksQuery.eq("assignee_mitra_id", mitraId);
    }
    if (projectId) {
      mitraTasksQuery = mitraTasksQuery.eq("project_id", projectId);
    }

    const { data: mitraTasks, error: mitraTasksError } = await mitraTasksQuery;

    if (mitraTasksError) {
      console.error("Mitra tasks query error:", mitraTasksError);
    }

    // Build transactions array
    const transactions: Array<{
      recipient_name: string;
      recipient_type: "pegawai" | "mitra";
      project_name: string;
      task_title: string;
      task_id: string;
      volume: number;
      rate: number;
      amount: number;
      date: string;
    }> = [];

    // Add pegawai allocations
    if (allocations && allocations.length > 0) {
      const pegawaiIds = [...new Set(allocations.map((a: any) => a.user_id))];
      const { data: pegawaiData } = await (svc as any)
        .from("users")
        .select("id, nama_lengkap")
        .in("id", pegawaiIds);

      const pegawaiMap = (pegawaiData || []).reduce(
        (acc: Record<string, string>, u: any) => {
          acc[u.id] = u.nama_lengkap;
          return acc;
        },
        {},
      );

      // Get all unique project IDs from allocations
      const projectIds = [
        ...new Set(
          allocations
            .map((a: any) => a.tasks?.project_id)
            .filter((id: any) => id != null),
        ),
      ];

      let projectMap: Record<string, string> = {};
      if (projectIds.length > 0) {
        const { data: projectData } = await (svc as any)
          .from("projects")
          .select("id, nama_project")
          .in("id", projectIds);

        projectMap = (projectData || []).reduce(
          (acc: Record<string, string>, p: any) => {
            acc[p.id] = p.nama_project;
            return acc;
          },
          {},
        );
      }

      allocations.forEach((allocation: any) => {
        if (type === "all" || type === "pegawai") {
          // Handle nested structure properly
          const task = allocation.tasks;
          const projectId = task?.project_id;

          transactions.push({
            recipient_name: pegawaiMap[allocation.user_id] || "Unknown",
            recipient_type: "pegawai",
            project_name: projectMap[projectId] || "-",
            task_title: task?.title || "-",
            task_id: allocation.task_id || "",
            volume: 1, // Each allocation represents 1 volume
            rate: allocation.amount || 0,
            amount: allocation.amount || 0,
            date: allocation.created_at,
          });
        }
      });
    }

    // Add mitra tasks
    if (mitraTasks && mitraTasks.length > 0) {
      const mitraIds = [
        ...new Set(mitraTasks.map((t: any) => t.assignee_mitra_id)),
      ];
      const { data: mitraData } = await (svc as any)
        .from("mitra")
        .select("id, nama_mitra")
        .in("id", mitraIds);

      const mitraMap = (mitraData || []).reduce(
        (acc: Record<string, string>, m: any) => {
          acc[m.id] = m.nama_mitra;
          return acc;
        },
        {},
      );

      // Get all unique project IDs from mitra tasks
      const projectIds = [
        ...new Set(
          mitraTasks
            .map((t: any) => t.project_id)
            .filter((id: any) => id != null),
        ),
      ];

      let projectMap: Record<string, string> = {};
      if (projectIds.length > 0) {
        const { data: projectData } = await (svc as any)
          .from("projects")
          .select("id, nama_project")
          .in("id", projectIds);

        projectMap = (projectData || []).reduce(
          (acc: Record<string, string>, p: any) => {
            acc[p.id] = p.nama_project;
            return acc;
          },
          {},
        );
      }

      mitraTasks.forEach((task: any) => {
        if (type === "all" || type === "mitra") {
          const volume = task.volume || 1;
          const rate = task.rate_per_satuan || task.honor_amount || 0;
          const amount = task.total_amount || task.honor_amount || 0;

          transactions.push({
            recipient_name: mitraMap[task.assignee_mitra_id] || "Unknown",
            recipient_type: "mitra",
            project_name: projectMap[task.project_id] || "-",
            task_title: task.title || "-",
            task_id: task.id || "",
            volume: volume,
            rate: rate,
            amount: amount,
            date: task.start_date,
          });
        }
      });
    }

    // Sort transactions by amount descending
    transactions.sort((a, b) => b.amount - a.amount);

    return NextResponse.json({
      period,
      transportSpending,
      honorSpending,
      totalSpending: transportSpending + honorSpending,
      monthlyBudget,
      topSpenders,
      transactions,
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
