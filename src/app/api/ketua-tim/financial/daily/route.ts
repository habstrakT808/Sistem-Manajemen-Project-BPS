import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface DaySummary {
  date: string; // yyyy-mm-dd
  total: number;
  transport: number;
  honor: number;
}

interface DayDetailItem {
  recipient_type: "pegawai" | "mitra";
  recipient_id: string;
  recipient_name: string;
  amount: number;
  project_id: string;
  project_name: string | null;
}

export async function GET(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createClient()) as any;
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get("month") || "0", 10);
    const year = parseInt(searchParams.get("year") || "0", 10);
    const day = searchParams.get("day"); // optional yyyy-mm-dd

    // Auth: ketua_tim only
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    if (
      profileError ||
      !profile ||
      (profile as { role: string }).role !== "ketua_tim"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Determine target month/year defaults to current
    const now = new Date();
    const targetMonth = month >= 1 && month <= 12 ? month : now.getMonth() + 1;
    const targetYear = year > 0 ? year : now.getFullYear();

    // Get projects owned by ketua tim
    const { data: projects } = await supabase
      .from("projects")
      .select("id, nama_project")
      .eq("ketua_tim_id", user.id);
    const projectIdToName = new Map<string, string>();
    const ownedProjectIds = new Set<string>();
    for (const p of projects || []) {
      const row = p as { id: string; nama_project: string };
      ownedProjectIds.add(row.id);
      projectIdToName.set(row.id, row.nama_project);
    }

    // If day is provided, return details for that exact day based on projects created that day
    if (day) {
      const [yyyy, mm, dd] = day.split("-").map((n) => parseInt(n, 10));
      if (!yyyy || !mm || !dd) {
        return NextResponse.json(
          { error: "Invalid day format" },
          { status: 400 }
        );
      }

      // Find projects created on this day
      const dayStart = new Date(yyyy, mm - 1, dd);
      const dayEnd = new Date(yyyy, mm - 1, dd, 23, 59, 59, 999);
      const { data: dayProjects } = await supabase
        .from("projects")
        .select("id, nama_project, created_at")
        .eq("ketua_tim_id", user.id)
        .gte("created_at", dayStart.toISOString())
        .lte("created_at", dayEnd.toISOString());

      const targetProjectIds = new Set(
        (dayProjects || []).map((p: { id: string }) => p.id)
      );

      if (targetProjectIds.size === 0) {
        return NextResponse.json({ date: day, details: [] });
      }

      // Get assignments contributing to project budget for those projects
      const { data: assignments } = await supabase
        .from("project_assignments")
        .select("project_id, assignee_type, assignee_id, uang_transport, honor")
        .in("project_id", Array.from(targetProjectIds));

      // Aggregate by recipient
      const byRecipient: Record<string, DayDetailItem> = {};
      for (const rec of (assignments || []) as Array<{
        project_id: string;
        assignee_type: "pegawai" | "mitra";
        assignee_id: string;
        uang_transport: number | null;
        honor: number | null;
      }>) {
        const key = `${rec.assignee_type}:${rec.assignee_id}`;
        if (!byRecipient[key]) {
          byRecipient[key] = {
            recipient_type: rec.assignee_type,
            recipient_id: rec.assignee_id,
            recipient_name: rec.assignee_id,
            amount: 0,
            project_id: rec.project_id,
            project_name: projectIdToName.get(rec.project_id) || null,
          };
        }
        byRecipient[key].amount += (rec.uang_transport || 0) + (rec.honor || 0);
      }

      // Resolve names
      const pegawaiIds = Object.values(byRecipient)
        .filter((d) => d.recipient_type === "pegawai")
        .map((d) => d.recipient_id);
      if (pegawaiIds.length > 0) {
        const { data: usersRows } = await supabase
          .from("users")
          .select("id, nama_lengkap")
          .in("id", pegawaiIds);
        for (const row of usersRows || []) {
          const r = row as { id: string; nama_lengkap: string };
          const key = `pegawai:${r.id}`;
          if (byRecipient[key])
            byRecipient[key].recipient_name = r.nama_lengkap;
        }
      }
      const mitraIds = Object.values(byRecipient)
        .filter((d) => d.recipient_type === "mitra")
        .map((d) => d.recipient_id);
      if (mitraIds.length > 0) {
        const { data: mitraRows } = await supabase
          .from("mitra")
          .select("id, nama_mitra")
          .in("id", mitraIds);
        for (const row of mitraRows || []) {
          const r = row as { id: string; nama_mitra: string };
          const key = `mitra:${r.id}`;
          if (byRecipient[key]) byRecipient[key].recipient_name = r.nama_mitra;
        }
      }

      const details = Object.values(byRecipient).sort(
        (a, b) => b.amount - a.amount
      );
      return NextResponse.json({ date: day, details });
    }

    // Monthly summaries by project creation date. Sum each project's initial budget (assignments) and assign to created_at day.
    const monthStart = new Date(targetYear, targetMonth - 1, 1);
    const monthEnd = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);
    const { data: monthProjects } = await supabase
      .from("projects")
      .select(
        `id, nama_project, created_at,
         project_assignments (uang_transport, honor)`
      )
      .eq("ketua_tim_id", user.id)
      .gte("created_at", monthStart.toISOString())
      .lte("created_at", monthEnd.toISOString());

    const totalsByDay = new Map<
      string,
      { total: number; transport: number; honor: number }
    >();
    for (const p of monthProjects || []) {
      const proj = p as {
        id: string;
        created_at: string;
        project_assignments: Array<{
          uang_transport: number | null;
          honor: number | null;
        }>;
      };
      const created = new Date(proj.created_at);
      const y = created.getFullYear();
      const m = String(created.getMonth() + 1).padStart(2, "0");
      const d = String(created.getDate()).padStart(2, "0");
      const key = `${y}-${m}-${d}`;

      const transport = (proj.project_assignments || []).reduce(
        (s, a) => s + (a.uang_transport || 0),
        0
      );
      const honor = (proj.project_assignments || []).reduce(
        (s, a) => s + (a.honor || 0),
        0
      );
      const total = transport + honor;

      const existing = totalsByDay.get(key) || {
        total: 0,
        transport: 0,
        honor: 0,
      };
      existing.total += total;
      existing.transport += transport;
      existing.honor += honor;
      totalsByDay.set(key, existing);
    }

    const summaries: DaySummary[] = Array.from(totalsByDay.entries()).map(
      ([date, v]) => ({
        date,
        total: v.total,
        transport: v.transport,
        honor: v.honor,
      })
    );

    return NextResponse.json({
      month: targetMonth,
      year: targetYear,
      days: summaries,
    });
  } catch (error) {
    console.error("Financial daily API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
