import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

/**
 * GET /api/admin/export/bast/tasks
 * Fetch tasks mitra untuk BAST dan hitung total volume per satuan
 * Query params: projectId, mitraId
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
    const mitraId = searchParams.get("mitraId");

    if (!projectId || !mitraId) {
      return NextResponse.json(
        { error: "projectId and mitraId are required" },
        { status: 400 },
      );
    }

    // Use service client to bypass RLS
    const svc = await createServiceRoleClient();

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

    // Fetch all tasks for this mitra in the project
    const { data: tasks, error: tasksError } = await (svc as any)
      .from("tasks")
      .select(
        `
        id,
        title,
        start_date,
        end_date,
        volume,
        satuan_id,
        satuan:satuan_id ( nama_satuan )
      `,
      )
      .eq("project_id", projectId)
      .eq("assignee_mitra_id", mitraId)
      .order("start_date", { ascending: true });

    if (tasksError) {
      console.error("Error fetching tasks:", tasksError);
      throw tasksError;
    }

    // Group volume by satuan and calculate total
    const satuanMap = new Map<string, { nama_satuan: string; total: number }>();

    (tasks || []).forEach((task: any) => {
      const vol = parseFloat(task.volume || 0);
      if (vol > 0 && task.satuan) {
        const satuanName = task.satuan.nama_satuan;
        if (satuanMap.has(satuanName)) {
          satuanMap.get(satuanName)!.total += vol;
        } else {
          satuanMap.set(satuanName, { nama_satuan: satuanName, total: vol });
        }
      }
    });

    // Convert to array
    const volumeBySatuan = Array.from(satuanMap.values());

    // Calculate total volume across all satuan
    const totalVolume = volumeBySatuan.reduce(
      (sum, item) => sum + item.total,
      0,
    );

    return NextResponse.json({
      mitra: {
        id: mitra.id,
        nama_mitra: mitra.nama_mitra,
        alamat: mitra.alamat || "",
        kontak: mitra.kontak || "",
        pekerjaan: mitra.mitra_occupations?.name || "",
      },
      tasks: tasks || [],
      volumeBySatuan,
      totalVolume,
    });
  } catch (error) {
    console.error("Error fetching BAST tasks:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
