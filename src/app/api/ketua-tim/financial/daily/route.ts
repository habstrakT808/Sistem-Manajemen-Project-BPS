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
    const monthParam = searchParams.get("month");
    const yearParam = searchParams.get("year");
    const dayParam = searchParams.get("day");

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find owned projects (ketua or leader)
    const { data: owned } = await (svc as any)
      .from("projects")
      .select("id")
      .or(`ketua_tim_id.eq.${user.id},leader_user_id.eq.${user.id}`);
    const ownedIds = (owned || []).map((p: { id: string }) => p.id);

    if (ownedIds.length === 0) {
      if (dayParam) return NextResponse.json({ date: dayParam, details: [] });
      const now = new Date();
      return NextResponse.json({
        month: Number(monthParam || now.getMonth() + 1),
        year: Number(yearParam || now.getFullYear()),
        days: [],
      });
    }

    // If specific day: compute details strictly for that date
    if (dayParam) {
      const day = dayParam;

      // Get basic tasks mapping (for project lookup on allocations)
      const { data: allTasks } = await (svc as any)
        .from("tasks")
        .select("id, project_id, pegawai_id")
        .in("project_id", ownedIds);

      // Get transport allocations for this day
      const { data: allocations } = await (svc as any)
        .from("task_transport_allocations")
        .select("task_id, amount, user_id")
        .eq("allocation_date", day)
        .is("canceled_at", null);

      // Get task titles for allocations
      const allocationTaskIds = Array.from(
        new Set((allocations || []).map((a: any) => a.task_id).filter(Boolean)),
      );
      const { data: allocationTasks } = allocationTaskIds.length
        ? await (svc as any)
            .from("tasks")
            .select("id, title")
            .in("id", allocationTaskIds)
        : { data: [] };
      const taskTitleById = new Map<string, string>(
        (allocationTasks || []).map((t: any) => [t.id, t.title || ""]),
      );

      // Get user and project info
      const userIds = Array.from(
        new Set([
          ...(allTasks || []).map((t: any) => t.pegawai_id).filter(Boolean),
          ...(allocations || []).map((a: any) => a.user_id).filter(Boolean),
        ]),
      );
      const mitraIds = Array.from(
        new Set(
          (allTasks || []).map((t: any) => t.assignee_mitra_id).filter(Boolean),
        ),
      );
      const projectIds = Array.from(
        new Set((allTasks || []).map((t: any) => t.project_id).filter(Boolean)),
      );

      const [{ data: userRows }, { data: mitraRows }, { data: projectRows }] =
        await Promise.all([
          userIds.length
            ? (svc as any)
                .from("users")
                .select("id, nama_lengkap")
                .in("id", userIds)
            : { data: [] },
          // mitra names will be needed for honor details (fetched below after we know overlapping tasks)
          { data: [] },
          projectIds.length
            ? (svc as any)
                .from("projects")
                .select("id, nama_project")
                .in("id", projectIds)
            : { data: [] },
        ]);

      const userNameById = new Map<string, string>(
        (userRows || []).map((u: any) => [u.id, u.nama_lengkap]),
      );
      // Mitra names will be resolved later specifically for overlapping tasks on this day
      const _mitraNameById = new Map<string, string>(
        (mitraRows || []).map((m: any) => [m.id, m.nama_mitra]),
      );
      const projectNameById = new Map<string, string>(
        (projectRows || []).map((p: any) => [p.id, p.nama_project]),
      );
      // Create taskIdToProject mapping
      const taskIdToProject = new Map<string, string>();
      (allTasks || []).forEach((task: any) => {
        taskIdToProject.set(task.id, task.project_id);
      });

      // Calculate details for the day
      const details: any[] = [];

      // Transport details come from allocations exactly on this date
      (allocations || []).forEach((a: any) => {
        const userId = a.user_id;
        const pid = taskIdToProject.get(a.task_id) || null;
        const taskTitle = taskTitleById.get(a.task_id) || "";
        details.push({
          recipient_type: "pegawai",
          recipient_id: userId,
          recipient_name:
            (userId && userNameById.get(userId)) ||
            (userId ? `Pegawai ${String(userId).slice(0, 6)}` : "Pegawai"),
          amount: Number(a.amount || 0),
          project_id: pid,
          project_name: pid ? projectNameById.get(pid) || null : null,
          task_title: taskTitle,
        });
      });

      // Honor details: only tasks created on the selected day (start_date == day)
      const { data: overlappingMitraTasks } = await (svc as any)
        .from("tasks")
        .select(
          "id, project_id, assignee_mitra_id, start_date, end_date, honor_amount, total_amount, title",
        )
        .in("project_id", ownedIds)
        .not("assignee_mitra_id", "is", null)
        .eq("start_date", day);

      const mitraIdsForDay = Array.from(
        new Set(
          (overlappingMitraTasks || [])
            .map((t: any) => t.assignee_mitra_id)
            .filter(Boolean),
        ),
      );
      const { data: mitraNameRows } = mitraIdsForDay.length
        ? await (svc as any)
            .from("mitra")
            .select("id, nama_mitra")
            .in("id", mitraIdsForDay)
        : { data: [] };
      const mitraNameById = new Map<string, string>(
        (mitraNameRows || []).map((m: any) => [m.id, m.nama_mitra]),
      );

      (overlappingMitraTasks || []).forEach((task: any) => {
        const amount = Number(task.total_amount || task.honor_amount || 0);
        if (amount > 0) {
          details.push({
            recipient_type: "mitra",
            recipient_id: task.assignee_mitra_id,
            recipient_name:
              mitraNameById.get(task.assignee_mitra_id) ||
              `Mitra ${String(task.assignee_mitra_id).slice(0, 6)}`,
            amount,
            project_id: task.project_id,
            project_name: projectNameById.get(task.project_id) || null,
            task_title: task.title || "",
          });
        }
      });

      return NextResponse.json({ date: dayParam, details });
    }

    // Monthly calendar data
    const now = new Date();
    const month = Number(monthParam || now.getMonth() + 1);
    const year = Number(yearParam || now.getFullYear());

    // Build month range strings
    const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));
    const monthStartStr = `${year}-${pad2(month)}-01`;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextMonthYear = month === 12 ? year + 1 : year;
    const monthEndExclusive = `${nextMonthYear}-${pad2(nextMonth)}-01`;

    // Transport sums by date from earnings_ledger
    const { data: tasksInOwned } = await (svc as any)
      .from("tasks")
      .select("id, project_id")
      .in("project_id", ownedIds);
    const ownedTaskIds = new Set<string>(
      (tasksInOwned || []).map((t: any) => t.id),
    );

    const { data: monthAllocs } = await (svc as any)
      .from("task_transport_allocations")
      .select("id, task_id, allocation_date, canceled_at")
      .gte("allocation_date", monthStartStr)
      .lt("allocation_date", monthEndExclusive)
      .is("canceled_at", null);
    const allocationIds = (monthAllocs || [])
      .filter((a: any) => ownedTaskIds.has(a.task_id))
      .map((a: any) => a.id);

    const { data: monthLedger } = allocationIds.length
      ? await (svc as any)
          .from("earnings_ledger")
          .select("amount, occurred_on, source_id")
          .eq("type", "transport")
          .gte("occurred_on", monthStartStr)
          .lt("occurred_on", monthEndExclusive)
          .in("source_id", allocationIds)
      : { data: [] };
    const transportByDate = new Map<string, number>();
    (monthLedger || []).forEach((e: any) => {
      const d = (e.occurred_on as string).slice(0, 10);
      transportByDate.set(
        d,
        (transportByDate.get(d) || 0) + Number(e.amount || 0),
      );
    });

    // Honor sums by date from mitra tasks start_date
    const { data: monthMitraTasks } = await (svc as any)
      .from("tasks")
      .select("start_date, project_id, assignee_mitra_id, honor_amount")
      .in("project_id", ownedIds)
      .gte("start_date", monthStartStr)
      .lt("start_date", monthEndExclusive);
    const honorByDate = new Map<string, number>();
    (monthMitraTasks || [])
      .filter(
        (t: any) => t.assignee_mitra_id && Number(t.honor_amount || 0) > 0,
      )
      .forEach((t: any) => {
        const d = (t.start_date as string).slice(0, 10);
        honorByDate.set(
          d,
          (honorByDate.get(d) || 0) + Number(t.honor_amount || 0),
        );
      });

    // Compose full days array for calendar
    const lastDay = new Date(nextMonthYear, nextMonth - 1, 0).getDate();
    const days: Array<{
      date: string;
      total: number;
      transport: number;
      honor: number;
    }> = [];
    for (let dayNum = 1; dayNum <= lastDay; dayNum++) {
      const key = `${year}-${pad2(month)}-${pad2(dayNum)}`;
      const transport = transportByDate.get(key) || 0;
      const honor = honorByDate.get(key) || 0;
      days.push({ date: key, total: transport + honor, transport, honor });
    }

    return NextResponse.json({ month, year, days });
  } catch (error) {
    console.error("Financial Daily API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
