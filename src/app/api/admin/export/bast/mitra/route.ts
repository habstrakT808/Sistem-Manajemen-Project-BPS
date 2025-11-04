import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

/**
 * GET /api/admin/export/bast/mitra
 * Fetch mitra yang memiliki task di project tertentu untuk bulan tertentu
 * Query params: projectId, month (1-12), year
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

    if (!projectId || !month || !year) {
      return NextResponse.json(
        { error: "projectId, month, and year are required" },
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
    const endDate = new Date(yearNum, monthNum, 0); // Last day of month

    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];

    // Fetch tasks with mitra in the specified month
    const { data: tasks, error: tasksError } = await (svc as any)
      .from("tasks")
      .select(
        `
        id,
        title,
        start_date,
        end_date,
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
      .eq("project_id", projectId)
      .not("assignee_mitra_id", "is", null)
      .lte("start_date", endDateStr)
      .gte("end_date", startDateStr);

    if (tasksError) {
      console.error("Error fetching tasks:", tasksError);
      throw tasksError;
    }

    // Group by mitra
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
        });
      }

      const mitraData = mitraMap.get(mitraId);
      mitraData.taskCount += 1;
    });

    // Convert map to array
    const mitraList = Array.from(mitraMap.values());

    return NextResponse.json({ mitra: mitraList });
  } catch (error) {
    console.error("Error fetching mitra for BAST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
