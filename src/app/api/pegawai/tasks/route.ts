// File: src/app/api/pegawai/tasks/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createClient()) as any;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const projectId = searchParams.get("project_id");
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role validation
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !userProfile ||
      (userProfile as { role: string }).role !== "pegawai"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Build query
    let query = supabase
      .from("tasks")
      .select(
        `
        id,
        deskripsi_tugas,
        tanggal_tugas,
        status,
        response_pegawai,
        created_at,
        updated_at,
        projects!inner (
          id,
          nama_project,
          status,
          users!inner (nama_lengkap)
        )
      `
      )
      .eq("pegawai_id", user.id);

    // Apply filters
    if (status) {
      query = query.eq("status", status);
    }
    if (projectId) {
      query = query.eq("project_id", projectId);
    }
    if (dateFrom) {
      query = query.gte("tanggal_tugas", dateFrom);
    }
    if (dateTo) {
      query = query.lte("tanggal_tugas", dateTo);
    }

    const { data: tasks, error: tasksError } = await query
      .order("tanggal_tugas", { ascending: false })
      .limit(50);

    if (tasksError) {
      throw tasksError;
    }

    return NextResponse.json({ data: tasks || [] });
  } catch (error) {
    console.error("Pegawai Tasks API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
