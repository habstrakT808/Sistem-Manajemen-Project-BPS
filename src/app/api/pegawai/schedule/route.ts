// File: src/app/api/pegawai/schedule/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createClient()) as any;
    const { searchParams } = new URL(request.url);
    const month =
      searchParams.get("month") || (new Date().getMonth() + 1).toString();
    const year =
      searchParams.get("year") || new Date().getFullYear().toString();

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

    // Get tasks for the month
    const startDate = `${year}-${month.padStart(2, "0")}-01`;
    const endDate = new Date(parseInt(year), parseInt(month), 0)
      .toISOString()
      .split("T")[0];

    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select(
        `
        id,
        deskripsi_tugas,
        tanggal_tugas,
        status,
        projects!inner (
          nama_project,
          status
        )
      `
      )
      .eq("pegawai_id", user.id)
      .gte("tanggal_tugas", startDate)
      .lte("tanggal_tugas", endDate)
      .order("tanggal_tugas", { ascending: true });

    if (tasksError) {
      throw tasksError;
    }

    // Format tasks
    const formattedTasks = (tasks || []).map(
      (task: {
        id: string;
        deskripsi_tugas: string;
        tanggal_tugas: string;
        status: string;
        projects: {
          nama_project: string;
          status: string;
        };
      }) => ({
        id: task.id,
        deskripsi_tugas: task.deskripsi_tugas,
        tanggal_tugas: task.tanggal_tugas,
        status: task.status,
        project_name: task.projects.nama_project,
        project_status: task.projects.status,
      })
    );

    // Calculate monthly summary
    const monthlySummary = {
      total_tasks: formattedTasks.length,
      pending_tasks: formattedTasks.filter(
        (t: { status: string }) => t.status === "pending"
      ).length,
      in_progress_tasks: formattedTasks.filter(
        (t: { status: string }) => t.status === "in_progress"
      ).length,
      completed_tasks: formattedTasks.filter(
        (t: { status: string }) => t.status === "completed"
      ).length,
    };

    return NextResponse.json({
      tasks: formattedTasks,
      monthly_summary: monthlySummary,
      month: parseInt(month),
      year: parseInt(year),
    });
  } catch (error) {
    console.error("Schedule API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
