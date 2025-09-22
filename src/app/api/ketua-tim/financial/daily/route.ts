import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/../database/types/database.types";

export async function GET(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createClient()) as any;
    const svc = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
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

    // Source of spending: project_assignments amounts (transport/honor)
    const { data: assigns } = await (svc as any)
      .from("project_assignments")
      .select(
        "project_id, assignee_type, assignee_id, uang_transport, honor, created_at"
      )
      .in("project_id", ownedIds);

    // If specific day: return simple synthesized details list
    if (dayParam) {
      const dayItems = (assigns || []).filter(
        (a: { created_at: string }) => a.created_at?.slice(0, 10) === dayParam
      );

      // Resolve names for recipients
      const pegawaiIds = Array.from(
        new Set(
          dayItems
            .filter(
              (a: { assignee_type: string }) => a.assignee_type === "pegawai"
            )
            .map((a: { assignee_id: string }) => a.assignee_id)
        )
      );
      const mitraIds = Array.from(
        new Set(
          dayItems
            .filter(
              (a: { assignee_type: string }) => a.assignee_type === "mitra"
            )
            .map((a: { assignee_id: string }) => a.assignee_id)
        )
      );
      const [{ data: userRows }, { data: mitraRows }, { data: projRows }] =
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
          (svc as any)
            .from("projects")
            .select("id, nama_project")
            .in("id", ownedIds),
        ]);
      const userNameById = new Map<string, string>(
        (userRows || []).map((u: any) => [u.id, u.nama_lengkap])
      );
      const mitraNameById = new Map<string, string>(
        (mitraRows || []).map((m: any) => [m.id, m.nama_mitra])
      );
      const projectNameById = new Map<string, string>(
        (projRows || []).map((p: any) => [p.id, p.nama_project])
      );

      const details = dayItems.map(
        (a: {
          assignee_type: string;
          assignee_id: string;
          uang_transport: number | null;
          honor: number | null;
          project_id: string;
        }) => ({
          recipient_type: a.assignee_type,
          recipient_id: a.assignee_id,
          recipient_name:
            a.assignee_type === "pegawai"
              ? userNameById.get(a.assignee_id) ||
                `Pegawai ${a.assignee_id.slice(0, 6)}`
              : mitraNameById.get(a.assignee_id) ||
                `Mitra ${a.assignee_id.slice(0, 6)}`,
          amount: (a.uang_transport || 0) + (a.honor || 0),
          project_id: a.project_id,
          project_name: projectNameById.get(a.project_id) || null,
        })
      );
      return NextResponse.json({ date: dayParam, details });
    }

    // Monthly calendar data
    const now = new Date();
    const month = Number(monthParam || now.getMonth() + 1);
    const year = Number(yearParam || now.getFullYear());

    // Compute number of days in target month
    const daysInMonth = new Date(year, month, 0).getDate();
    const days: Array<{
      date: string;
      total: number;
      transport: number;
      honor: number;
    }> = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const items = (assigns || []).filter(
        (a: { created_at: string }) => a.created_at?.slice(0, 10) === dateStr
      );
      const transport = items
        .filter((i: { assignee_type: string }) => i.assignee_type === "pegawai")
        .reduce(
          (s: number, i: { uang_transport: number | null }) =>
            s + (i.uang_transport || 0),
          0
        );
      const honor = items
        .filter((i: { assignee_type: string }) => i.assignee_type === "mitra")
        .reduce(
          (s: number, i: { honor: number | null }) => s + (i.honor || 0),
          0
        );
      days.push({ date: dateStr, total: transport + honor, transport, honor });
    }

    return NextResponse.json({ month, year, days });
  } catch (error) {
    console.error("Financial Daily API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
