// File: src/app/api/pegawai/tasks/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface TaskUpdateData {
  status?: "pending" | "in_progress" | "completed";
  response_pegawai?: string;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createClient()) as any;
    const taskId = params.id;
    const updateData: TaskUpdateData = await request.json();

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

    // Verify task belongs to this pegawai
    const { data: task, error: taskError } = await supabase
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

    // Update task
    const { data: updatedTask, error: updateError } = await supabase
      .from("tasks")
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
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
  { params }: { params: { id: string } }
) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createClient()) as any;
    const taskId = params.id;

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get task with project details
    const { data: task, error: taskError } = await supabase
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
          deadline,
          users!inner (nama_lengkap)
        )
      `
      )
      .eq("id", taskId)
      .eq("pegawai_id", user.id)
      .single();

    if (taskError) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ data: task });
  } catch (error) {
    console.error("Task Detail API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
