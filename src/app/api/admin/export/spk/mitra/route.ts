import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

/**
 * GET /api/admin/export/spk/mitra
 * Fetch mitra yang memiliki task di bulan tertentu (dari semua project)
 * Query params: month (1-12), year
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
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    if (!month || !year) {
      return NextResponse.json(
        { error: "month and year are required" },
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

    // Calculate date range for the month (manual format to avoid timezone issues)
    const monthStr = monthNum.toString().padStart(2, "0");
    const startDateStr = `${yearNum}-${monthStr}-01`;
    const lastDay = new Date(yearNum, monthNum, 0).getDate();
    const endDateStr = `${yearNum}-${monthStr}-${lastDay.toString().padStart(2, "0")}`;

    // Fetch tasks with mitra in the specified month (from all projects)
    let { data: tasks, error: tasksError } = await (svc as any)
      .from("tasks")
      .select(
        `
        id,
        title,
        start_date,
        end_date,
        tanggal_tugas,
        honor_amount,
        satuan_id,
        rate_per_satuan,
        volume,
        assignee_mitra_id,
        mitra:assignee_mitra_id (
          id,
          nama_mitra,
          alamat,
          kontak,
          pekerjaan_id,
          mitra_occupations:pekerjaan_id (
            name
          )
        )
      `,
      )
      .not("assignee_mitra_id", "is", null)
      .gte("start_date", startDateStr)
      .lte("start_date", endDateStr);

    // Fallback: some legacy records may only have tanggal_tugas
    if ((!tasks || tasks.length === 0) && !tasksError) {
      const { data: legacyTasks, error: legacyError } = await (svc as any)
        .from("tasks")
        .select(
          `
        id,
        title,
        start_date,
        end_date,
        tanggal_tugas,
        honor_amount,
        satuan_id,
        rate_per_satuan,
        volume,
        assignee_mitra_id,
        mitra:assignee_mitra_id (
          id,
          nama_mitra,
          alamat,
          kontak,
          pekerjaan_id,
          mitra_occupations:pekerjaan_id (
            name
          )
        )
      `,
        )
        .not("assignee_mitra_id", "is", null)
        .gte("tanggal_tugas", startDateStr)
        .lte("tanggal_tugas", endDateStr);

      if (!legacyError && legacyTasks && legacyTasks.length > 0) {
        tasks = legacyTasks;
      }
    }

    if (tasksError) {
      console.error("Error fetching tasks:", tasksError);
      throw tasksError;
    }

    // Group tasks by mitra
    const mitraMap = new Map<string, any>();

    (tasks || []).forEach((task: any) => {
      if (!task.mitra) return;

      const mitraId = task.mitra.id;

      if (!mitraMap.has(mitraId)) {
        mitraMap.set(mitraId, {
          id: mitraId,
          nama_mitra: task.mitra.nama_mitra,
          alamat: task.mitra.alamat || "",
          kontak: task.mitra.kontak || "",
          pekerjaan: task.mitra.mitra_occupations?.name || "",
          taskCount: 0,
          totalHonor: 0,
        });
      }

      const mitraData = mitraMap.get(mitraId);
      mitraData.taskCount += 1;
      const rate = parseFloat(task.rate_per_satuan || 0);
      const vol = parseFloat(task.volume || 0);
      const line =
        rate > 0 && vol > 0 ? rate * vol : parseFloat(task.honor_amount || 0);
      mitraData.totalHonor += line;
    });

    // Convert map to array
    const mitraList = Array.from(mitraMap.values());

    return NextResponse.json({ mitra: mitraList });
  } catch (error) {
    console.error("Error fetching mitra for SPK:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
