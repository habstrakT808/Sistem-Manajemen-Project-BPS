import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

/**
 * GET /api/admin/export/spk/tasks
 * Fetch tasks mitra untuk SPK
 * Query params: projectId, month (1-12), year, mitraId
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: userProfile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!userProfile || (userProfile as { role: string }).role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get("projectId");
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const mitraId = searchParams.get("mitraId");

    if (!projectId || !month || !year || !mitraId) {
      return NextResponse.json(
        { error: "projectId, month, year, and mitraId are required" },
        { status: 400 },
      );
    }

    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    if (monthNum < 1 || monthNum > 12) {
      return NextResponse.json(
        { error: "Invalid month (must be 1-12)" },
        { status: 400 },
      );
    }

    // Use service client to bypass RLS
    const svc = await createServiceRoleClient();

    // Calculate date range for the month
    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0);

    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];

    // Fetch mitra details
    const { data: mitra, error: mitraError } = await (svc as any)
      .from("mitra")
      .select(
        `
        id,
        nama_mitra,
        alamat,
        kontak,
        pekerjaan_id,
        mitra_occupations:pekerjaan_id (
          name
        )
      `,
      )
      .eq("id", mitraId)
      .single();

    if (mitraError || !mitra) {
      return NextResponse.json({ error: "Mitra not found" }, { status: 404 });
    }

    // Fetch tasks for this mitra in the specified month
    const { data: tasks, error: tasksError } = await (svc as any)
      .from("tasks")
      .select(
        `
        id,
        title,
        start_date,
        end_date,
        honor_amount,
        satuan_id,
        rate_per_satuan,
        volume,
        satuan:satuan_id ( nama_satuan )
      `,
      )
      .eq("project_id", projectId)
      .eq("assignee_mitra_id", mitraId)
      .lte("start_date", endDateStr)
      .gte("end_date", startDateStr)
      .order("start_date", { ascending: true });

    if (tasksError) {
      console.error("Error fetching tasks:", tasksError);
      throw tasksError;
    }

    // Calculate total honor
    const totalHonor = (tasks || []).reduce((sum: number, task: any) => {
      const rate = parseFloat(task.rate_per_satuan || 0);
      const vol = parseFloat(task.volume || 0);
      const line =
        rate > 0 && vol > 0 ? rate * vol : parseFloat(task.honor_amount || 0);
      return sum + line;
    }, 0);

    return NextResponse.json({
      mitra: {
        id: mitra.id,
        nama_mitra: mitra.nama_mitra,
        alamat: mitra.alamat || "",
        kontak: mitra.kontak || "",
        pekerjaan: mitra.mitra_occupations?.name || "",
      },
      tasks: tasks || [],
      totalHonor,
    });
  } catch (error) {
    console.error("Error fetching SPK tasks:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
