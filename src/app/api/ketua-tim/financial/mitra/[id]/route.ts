import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/../database/types/database.types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = (await createClient()) as any;
    const svc = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = Number(searchParams.get("month"));
    const year = Number(searchParams.get("year"));
    if (!month || !year) {
      return NextResponse.json(
        { error: "month and year are required" },
        { status: 400 },
      );
    }

    // Projects owned by current ketua tim
    const { data: ownedProjects } = await (svc as any)
      .from("projects")
      .select("id")
      .or(`ketua_tim_id.eq.${user.id},leader_user_id.eq.${user.id}`);
    const ownedIds = (ownedProjects || []).map((p: any) => p.id);
    if (ownedIds.length === 0) {
      return NextResponse.json({ tasks: [], projects: [] });
    }

    // Month boundaries
    const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));
    const startStr = `${year}-${pad2(month)}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endInclusiveStr = `${year}-${pad2(month)}-${pad2(lastDay)}`;

    const { id: mitraId } = await params;

    // Fetch tasks for mitra within the month under owned projects
    let { data: tasks } = await (svc as any)
      .from("tasks")
      .select(
        "id, title, deskripsi_tugas, project_id, start_date, end_date, tanggal_tugas, honor_amount, total_amount, has_transport, transport_days",
      )
      .in("project_id", ownedIds)
      .eq("assignee_mitra_id", mitraId)
      .gte("start_date", startStr)
      .lte("start_date", endInclusiveStr)
      .order("start_date", { ascending: true });

    // Fallback: some legacy records may only set tanggal_tugas
    if (!tasks || tasks.length === 0) {
      const { data: legacyTasks } = await (svc as any)
        .from("tasks")
        .select(
          "id, title, deskripsi_tugas, project_id, start_date, end_date, tanggal_tugas, honor_amount, total_amount, has_transport, transport_days",
        )
        .in("project_id", ownedIds)
        .eq("assignee_mitra_id", mitraId)
        .gte("tanggal_tugas", startStr)
        .lte("tanggal_tugas", endInclusiveStr)
        .order("tanggal_tugas", { ascending: true });
      tasks = legacyTasks || [];
    }

    const projectIds = Array.from(
      new Set((tasks || []).map((t: any) => t.project_id)),
    );

    const { data: projects } =
      projectIds.length > 0
        ? await (svc as any)
            .from("projects")
            .select("id, nama_project, status")
            .in("id", projectIds)
        : { data: [] };

    // Optional: resolve mitra name
    const { data: mitraRow } = await (svc as any)
      .from("mitra")
      .select("id, nama_mitra")
      .eq("id", mitraId)
      .maybeSingle();

    return NextResponse.json({
      mitra: mitraRow || {
        id: mitraId,
        nama_mitra: `Mitra ${mitraId.slice(0, 6)}`,
      },
      month,
      year,
      projects: projects || [],
      tasks: tasks || [],
    });
  } catch (error) {
    console.error("Mitra detail API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
