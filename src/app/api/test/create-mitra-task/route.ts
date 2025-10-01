import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function POST(_request: NextRequest) {
  try {
    console.log("🧪 [TEST] Creating mitra task with honor...");

    // Use service client to bypass RLS
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Find an existing mitra user
    const { data: mitraUser } = await supabase
      .from("users")
      .select("id, nama_lengkap")
      .eq("role", "mitra")
      .eq("is_active", true)
      .limit(1)
      .single();

    if (!mitraUser) {
      return NextResponse.json(
        {
          success: false,
          error: "No mitra user found",
        },
        { status: 404 },
      );
    }

    // Find an existing project
    const { data: project } = await supabase
      .from("projects")
      .select("id, nama_project")
      .eq("status", "active")
      .limit(1)
      .single();

    if (!project) {
      return NextResponse.json(
        {
          success: false,
          error: "No active project found",
        },
        { status: 404 },
      );
    }

    const honorAmount = 750000; // 750k honor

    // Create task with honor for mitra
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .insert({
        title: `Mitra Task with Honor ${Date.now()}`,
        deskripsi_tugas: "Test task for mitra with honor amount",
        tanggal_tugas: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        start_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        end_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        honor_amount: honorAmount,
        status: "pending",
        assignee_user_id: mitraUser.id,
        project_id: project.id,
      })
      .select()
      .single();

    if (taskError) {
      console.error("🧪 [TEST] Task creation error:", taskError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create mitra task",
          details: taskError,
        },
        { status: 500 },
      );
    }

    console.log(
      "🧪 [TEST] Mitra task created:",
      task.id,
      "with honor:",
      honorAmount,
    );

    return NextResponse.json({
      success: true,
      message: "Mitra task with honor created successfully",
      data: {
        taskId: task.id,
        mitraUser: mitraUser.nama_lengkap,
        project: project.nama_project,
        honorAmount: honorAmount,
      },
    });
  } catch (error) {
    console.error("🧪 [TEST] Error creating mitra task:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
