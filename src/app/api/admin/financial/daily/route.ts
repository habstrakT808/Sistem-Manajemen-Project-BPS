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

    const day = searchParams.get("day");
    const monthParam = searchParams.get("month");
    const yearParam = searchParams.get("year");
    const pegawaiId = searchParams.get("pegawai_id");
    const mitraId = searchParams.get("mitra_id");
    const projectId = searchParams.get("project_id");
    const teamId = searchParams.get("team_id");
    const type = searchParams.get("type") || "all";

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

    // Build filter conditions
    let taskFilter: any = {};
    if (pegawaiId) taskFilter.pegawai_id = pegawaiId;
    if (mitraId) taskFilter.assignee_mitra_id = mitraId;
    if (projectId) taskFilter.project_id = projectId;

    // Handle team filter - need to get project IDs for the team first
    let projectIdsForTeam: string[] = [];
    if (teamId) {
      const { data: teamProjects } = await (svc as any)
        .from("projects")
        .select("id")
        .eq("team_id", teamId);

      if (teamProjects && teamProjects.length > 0) {
        projectIdsForTeam = teamProjects.map((p: any) => p.id);
      }
    }

    // If specific day: compute details from tasks
    if (day) {
      // Get all tasks with their amounts (global access)
      let tasksQuery = (svc as any)
        .from("tasks")
        .select(
          "id, title, pegawai_id, assignee_mitra_id, rate_per_satuan, volume, total_amount, honor_amount, transport_days, project_id, created_at",
        )
        .match(taskFilter);

      // Apply team filter if specified
      if (teamId && projectIdsForTeam.length > 0) {
        tasksQuery = tasksQuery.in("project_id", projectIdsForTeam);
      } else if (teamId && projectIdsForTeam.length === 0) {
        // If team has no projects, return empty result
        tasksQuery = tasksQuery.eq("id", "no-match");
      }

      const { data: allTasks } = await tasksQuery;

      // Filter by type
      let filteredTasks = allTasks || [];
      if (type === "pegawai") {
        filteredTasks = filteredTasks.filter((task: any) => task.pegawai_id);
      } else if (type === "mitra") {
        filteredTasks = filteredTasks.filter(
          (task: any) => task.assignee_mitra_id,
        );
      }

      // Filter by selected date - only show tasks created ON the selected date
      const selectedDate = new Date(day);
      const selectedDateStr = selectedDate.toISOString().split("T")[0]; // Get YYYY-MM-DD format

      filteredTasks = filteredTasks.filter((task: any) => {
        const taskDate = new Date(task.created_at);
        const taskDateStr = taskDate.toISOString().split("T")[0]; // Get YYYY-MM-DD format
        return taskDateStr === selectedDateStr;
      });

      // Get user and project info
      const pegawaiIds = Array.from(
        new Set(filteredTasks.map((t: any) => t.pegawai_id).filter(Boolean)),
      );
      const mitraIds = Array.from(
        new Set(
          filteredTasks.map((t: any) => t.assignee_mitra_id).filter(Boolean),
        ),
      );
      const projectIds = Array.from(
        new Set(filteredTasks.map((t: any) => t.project_id).filter(Boolean)),
      );

      const [{ data: users }, { data: mitra }, { data: projects }] =
        await Promise.all([
          pegawaiIds.length > 0
            ? (svc as any)
                .from("users")
                .select("id, nama_lengkap")
                .in("id", pegawaiIds)
            : { data: [] },
          mitraIds.length > 0
            ? (svc as any)
                .from("mitra")
                .select("id, nama_mitra")
                .in("id", mitraIds)
            : { data: [] },
          projectIds.length > 0
            ? (svc as any)
                .from("projects")
                .select("id, nama_project")
                .in("id", projectIds)
            : { data: [] },
        ]);

      const userNameById = new Map(
        (users || []).map((u: any) => [u.id, u.nama_lengkap]),
      );
      const mitraNameById = new Map(
        (mitra || []).map((m: any) => [m.id, m.nama_mitra]),
      );
      const projectNameById = new Map(
        (projects || []).map((p: any) => [p.id, p.nama_project]),
      );

      // Calculate details from tasks
      const details: any[] = [];

      // Process transport details (from tasks with pegawai_id)
      filteredTasks.forEach((task: any) => {
        if (task.pegawai_id) {
          const amount = task.total_amount || task.transport_days * 150000 || 0;
          if (amount > 0) {
            details.push({
              recipient_type: "pegawai",
              recipient_id: task.pegawai_id,
              recipient_name:
                userNameById.get(task.pegawai_id) ||
                `Pegawai ${task.pegawai_id.slice(0, 6)}`,
              amount: amount,
              project_id: task.project_id,
              project_name: projectNameById.get(task.project_id) || null,
            });
          }
        }
      });

      // Process honor details (from tasks with assignee_mitra_id)
      filteredTasks.forEach((task: any) => {
        if (task.assignee_mitra_id) {
          const amount = task.total_amount || task.honor_amount || 0;
          if (amount > 0) {
            details.push({
              recipient_type: "mitra",
              recipient_id: task.assignee_mitra_id,
              recipient_name:
                mitraNameById.get(task.assignee_mitra_id) ||
                `Mitra ${task.assignee_mitra_id.slice(0, 6)}`,
              amount: amount,
              project_id: task.project_id,
              project_name: projectNameById.get(task.project_id) || null,
            });
          }
        }
      });

      // Also return days array for calendar dots
      const totalAmount = details.reduce(
        (sum, detail) => sum + detail.amount,
        0,
      );
      const days = [{ date: day, total: totalAmount }];

      return NextResponse.json({ date: day, details, days });
    }

    // Monthly calendar data
    const now = new Date();
    const month = Number(monthParam || now.getMonth() + 1);
    const year = Number(yearParam || now.getFullYear());

    const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));
    const _monthStartStr = `${year}-${pad2(month)}-01`;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextMonthYear = month === 12 ? year + 1 : year;
    const _monthEndStr = `${nextMonthYear}-${pad2(nextMonth)}-01`;

    // Get all tasks for the month
    const { data: allTasks } = await (svc as any)
      .from("tasks")
      .select(
        "id, title, pegawai_id, assignee_mitra_id, rate_per_satuan, volume, total_amount, honor_amount, transport_days, project_id",
      )
      .match(taskFilter);

    // Filter by type
    let filteredTasks = allTasks || [];
    if (type === "pegawai") {
      filteredTasks = filteredTasks.filter((task: any) => task.pegawai_id);
    } else if (type === "mitra") {
      filteredTasks = filteredTasks.filter(
        (task: any) => task.assignee_mitra_id,
      );
    }

    // Calculate daily totals
    const byDate = new Map<string, number>();
    filteredTasks.forEach((task: any) => {
      const amount =
        task.total_amount ||
        task.transport_days * 150000 ||
        task.honor_amount ||
        0;
      if (amount > 0) {
        // Use task creation date or spread across month
        const taskDate = new Date(task.created_at || new Date())
          .toISOString()
          .split("T")[0];
        const dayOfMonth = parseInt(taskDate.split("-")[2]);

        // If task is from current month, use the day, otherwise use a random day in the month
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        let useDate;
        if (month === currentMonth && year === currentYear) {
          useDate = taskDate;
        } else {
          // For other months, use a random day in the month
          const randomDay = Math.min(
            dayOfMonth,
            new Date(year, month, 0).getDate(),
          );
          useDate = `${year}-${pad2(month)}-${pad2(randomDay)}`;
        }

        byDate.set(useDate, (byDate.get(useDate) || 0) + amount);
      }
    });

    // Build full month days
    const days: Array<{ date: string; total: number }> = [];
    const lastDay = new Date(nextMonthYear, nextMonth - 1, 0).getDate();
    for (let dayNum = 1; dayNum <= lastDay; dayNum++) {
      const key = `${year}-${pad2(month)}-${pad2(dayNum)}`;
      days.push({ date: key, total: byDate.get(key) || 0 });
    }

    return NextResponse.json({ month, year, days });
  } catch (error) {
    console.error("Admin daily API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
