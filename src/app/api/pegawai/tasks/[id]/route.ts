import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

interface TaskUpdateData {
  status?: "pending" | "in_progress" | "completed";
  response_pegawai?: string;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: taskId } = await params;
    const updateData: TaskUpdateData = await request.json();

    // Authentication check
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

    // Use service client for task update to bypass RLS
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify task belongs to this pegawai
    const { data: task, error: taskError } = await serviceClient
      .from("tasks")
      .select("pegawai_id")
      .eq("id", taskId)
      .single();

    if (taskError) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (task.pegawai_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update task using service client
    const { data: updatedTask, error: updateError } = await serviceClient
      .from("tasks")
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId)
      .select()
      .single();

    if (updateError) {
      console.error("Task update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update task" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: updatedTask });
  } catch (error) {
    console.error("Task Update API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: taskId } = await params;

    // Authentication check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use service client for task retrieval
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get task data
    const { data: task, error: taskError } = await serviceClient
      .from("tasks")
      .select(
        "id, deskripsi_tugas, tanggal_tugas, status, response_pegawai, created_at, updated_at, project_id, pegawai_id"
      )
      .eq("id", taskId)
      .eq("pegawai_id", user.id)
      .single();

    if (taskError) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Get project data
    const { data: project, error: projectError } = await serviceClient
      .from("projects")
      .select("id, nama_project, status, deadline, ketua_tim_id")
      .eq("id", task.project_id)
      .single();

    if (projectError) {
      console.error("Project fetch error:", projectError);
      return NextResponse.json(
        { error: "Failed to fetch project" },
        { status: 500 }
      );
    }

    // Get ketua tim data
    const { data: ketuaTim, error: ketuaTimError } = await serviceClient
      .from("users")
      .select("id, nama_lengkap")
      .eq("id", project.ketua_tim_id)
      .single();

    if (ketuaTimError) {
      console.error("Ketua tim fetch error:", ketuaTimError);
      return NextResponse.json(
        { error: "Failed to fetch ketua tim" },
        { status: 500 }
      );
    }

    // Combine data
    const enrichedTask = {
      id: task.id,
      deskripsi_tugas: task.deskripsi_tugas,
      tanggal_tugas: task.tanggal_tugas,
      status: task.status,
      response_pegawai: task.response_pegawai,
      created_at: task.created_at,
      updated_at: task.updated_at,
      projects: {
        id: project.id,
        nama_project: project.nama_project,
        status: project.status,
        deadline: project.deadline,
        users: {
          nama_lengkap: ketuaTim?.nama_lengkap || "Unknown Team Lead",
        },
      },
    };

    return NextResponse.json({ data: enrichedTask });
  } catch (error) {
    console.error("Task Detail API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
