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

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Resolve owned projects
    const { data: ownedProjects, error: ownedErr } = await (svc as any)
      .from("projects")
      .select("id")
      .or(`ketua_tim_id.eq.${user.id},leader_user_id.eq.${user.id}`);
    if (ownedErr) throw ownedErr;
    const ownedIds: string[] = (ownedProjects || []).map((p: any) => p.id);
    if (ownedIds.length === 0)
      return NextResponse.json({
        data: day
          ? { date: day, details: [] }
          : {
              month: Number(monthParam) || 0,
              year: Number(yearParam) || 0,
              days: [],
            },
      });

    // All tasks in owned projects
    const { data: taskRows, error: taskErr } = await (svc as any)
      .from("tasks")
      .select("id, project_id, assignee_user_id, deskripsi_tugas, title")
      .in("project_id", ownedIds);
    if (taskErr) throw taskErr;
    const taskIdSet = new Set<string>((taskRows || []).map((t: any) => t.id));

    if (day) {
      // Details for a specific day
      const { data: allocations, error: allocErr } = await (svc as any)
        .from("task_transport_allocations")
        .select("id, task_id, allocation_date, allocated_at, canceled_at")
        .eq("allocation_date", day)
        .is("canceled_at", null);
      if (allocErr) throw allocErr;

      const filtered = (allocations || []).filter((a: any) =>
        taskIdSet.has(a.task_id),
      );
      const allocTaskIds = Array.from(
        new Set(filtered.map((a: any) => a.task_id)),
      );

      const taskMap = new Map<string, any>(
        (taskRows || []).map((t: any) => [t.id, t]),
      );
      const userIds = Array.from(
        new Set(
          (allocTaskIds as string[])
            .map((tid) => {
              const row = taskMap.get(tid) as
                | { assignee_user_id?: string }
                | undefined;
              return row?.assignee_user_id;
            })
            .filter((v): v is string => Boolean(v)),
        ),
      );
      const projectIds = Array.from(
        new Set(
          (allocTaskIds as string[])
            .map((tid) => {
              const row = taskMap.get(tid) as
                | { project_id?: string }
                | undefined;
              return row?.project_id;
            })
            .filter((v): v is string => Boolean(v)),
        ),
      );

      const [{ data: users }, { data: projects }] = await Promise.all([
        (svc as any).from("users").select("id, nama_lengkap").in("id", userIds),
        (svc as any)
          .from("projects")
          .select("id, nama_project")
          .in("id", projectIds),
      ]);
      const userMap = new Map<string, any>(
        (users || []).map((u: any) => [u.id, u]),
      );
      const projectMap = new Map<string, any>(
        (projects || []).map((p: any) => [p.id, p]),
      );

      const details = filtered.map((a: any) => {
        const t = taskMap.get(a.task_id) || {};
        const u = t.assignee_user_id ? userMap.get(t.assignee_user_id) : null;
        const p = t.project_id ? projectMap.get(t.project_id) : null;
        return {
          allocation_id: a.id,
          allocation_date: a.allocation_date,
          employee_name: u?.nama_lengkap || "",
          project_name: p?.nama_project || String(t.project_id || ""),
          task_title: t.title || "",
          task_description: t.deskripsi_tugas || "",
        };
      });

      return NextResponse.json({ date: day, details });
    }

    // Month view for calendar heatmap
    const month = Number(monthParam);
    const year = Number(yearParam);
    if (!month || !year) {
      return NextResponse.json(
        { error: "month and year are required" },
        { status: 400 },
      );
    }
    const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));
    const monthStartStr = `${year}-${pad2(month)}-01`;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextMonthYear = month === 12 ? year + 1 : year;
    const monthEndStr = `${nextMonthYear}-${pad2(nextMonth)}-01`;

    const { data: allocations, error: allocErr } = await (svc as any)
      .from("task_transport_allocations")
      .select("id, task_id, allocation_date, canceled_at")
      .gte("allocation_date", monthStartStr)
      .lt("allocation_date", monthEndStr)
      .is("canceled_at", null);
    if (allocErr) throw allocErr;

    const filtered = (allocations || []).filter((a: any) =>
      taskIdSet.has(a.task_id),
    );
    const byDate = new Map<string, number>();
    filtered.forEach((a: any) => {
      const d = a.allocation_date;
      byDate.set(d, (byDate.get(d) || 0) + 1);
    });

    // Build full month days (avoid timezone shift)
    const days: Array<{ date: string; count: number }> = [];
    const lastDay = new Date(nextMonthYear, nextMonth - 1, 0).getDate();
    for (let dayNum = 1; dayNum <= lastDay; dayNum++) {
      const key = `${year}-${pad2(month)}-${pad2(dayNum)}`;
      days.push({ date: key, count: byDate.get(key) || 0 });
    }

    return NextResponse.json({ month, year, days });
  } catch (error) {
    console.error("Transport daily API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
