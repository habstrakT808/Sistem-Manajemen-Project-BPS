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
    const projectId = searchParams.get("project_id");
    const teamId = searchParams.get("team_id");

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

    // Build filter conditions for tasks
    let taskFilter: any = {};
    if (pegawaiId) taskFilter.pegawai_id = pegawaiId;
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

    // Get all tasks (global access)
    let tasksQuery = (svc as any)
      .from("tasks")
      .select(
        "id, project_id, pegawai_id, assignee_user_id, deskripsi_tugas, title, satuan_id, rate_per_satuan, volume, total_amount",
      )
      .match(taskFilter);

    // Apply team filter if specified
    if (teamId && projectIdsForTeam.length > 0) {
      tasksQuery = tasksQuery.in("project_id", projectIdsForTeam);
    } else if (teamId && projectIdsForTeam.length === 0) {
      // If team has no projects, return empty result
      tasksQuery = tasksQuery.eq("id", "no-match");
    }

    const { data: taskRows, error: taskErr } = await tasksQuery;

    if (taskErr) throw taskErr;
    const taskIdSet = new Set<string>((taskRows || []).map((t: any) => t.id));

    // Get satuan data for tasks that have satuan_id
    const satuanIds = Array.from(
      new Set((taskRows || []).map((t: any) => t.satuan_id).filter(Boolean)),
    );
    let satuanMap = new Map();
    if (satuanIds.length > 0) {
      const { data: satuanRows, error: satuanErr } = await (svc as any)
        .from("satuan_master")
        .select("id, nama_satuan")
        .in("id", satuanIds);

      if (satuanErr) throw satuanErr;
      satuanMap = new Map((satuanRows || []).map((s: any) => [s.id, s]));
    }

    if (day) {
      // Details for a specific day
      let allocationsQuery = (svc as any)
        .from("task_transport_allocations")
        .select("id, task_id, allocation_date, allocated_at, canceled_at")
        .eq("allocation_date", day)
        .is("canceled_at", null);

      // Apply team filter to allocations if specified
      if (teamId && projectIdsForTeam.length > 0) {
        // Filter allocations by tasks that belong to the team's projects
        allocationsQuery = allocationsQuery.in(
          "task_id",
          Array.from(taskIdSet),
        );
      } else if (teamId && projectIdsForTeam.length === 0) {
        allocationsQuery = allocationsQuery.eq("id", "no-match");
      }

      const { data: allocations, error: allocErr } = await allocationsQuery;

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
                | { pegawai_id?: string; assignee_user_id?: string }
                | undefined;
              return row?.pegawai_id || row?.assignee_user_id;
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
        const userId = t.pegawai_id || t.assignee_user_id;
        const u = userId ? userMap.get(userId) : null;
        const p = t.project_id ? projectMap.get(t.project_id) : null;
        const satuan = t.satuan_id ? satuanMap.get(t.satuan_id) : null;
        return {
          allocation_id: a.id,
          allocation_date: a.allocation_date,
          employee_name: u?.nama_lengkap || "",
          project_name: p?.nama_project || String(t.project_id || ""),
          task_title: t.title || "",
          task_description: t.deskripsi_tugas || "",
          // New satuan system fields
          satuan_id: t.satuan_id,
          satuan_name: satuan?.nama_satuan || null,
          rate_per_satuan: t.rate_per_satuan || null,
          volume: t.volume || null,
          total_amount: t.total_amount || null,
          // Calculate which volume this allocation represents
          volume_sequence: 1, // This will be calculated based on allocation order
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
    console.error("Admin transport daily API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
