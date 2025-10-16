// File: src/app/api/pegawai/tasks/[id]/route.ts
// UPDATED: Support new task structure

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface TaskExistsData {
  id: string;
  assignee_user_id: string | null;
  pegawai_id: string | null;
  project_id: string;
  title: string | null;
  deskripsi_tugas: string;
}

interface TaskData {
  id: string;
  title: string | null;
  deskripsi_tugas: string;
  start_date: string | null;
  end_date: string | null;
  has_transport: boolean | null;
  status: string;
  response_pegawai: string | null;
  created_at: string;
  updated_at: string;
  project_id: string;
}

interface ProjectData {
  id: string;
  nama_project: string;
  deskripsi: string;
  status: string;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id: taskId } = await params;

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Service client to avoid RLS issues
    const svc = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Debug: Check if task exists and get all relevant fields
    const { data: taskExists, error: existsError } = await svc
      .from("tasks")
      .select(
        "id, assignee_user_id, pegawai_id, project_id, title, deskripsi_tugas",
      )
      .eq("id", taskId)
      .single();

    if (existsError) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Check if user has access to this task
    const taskExistsData = taskExists as TaskExistsData;
    const hasAccess =
      taskExistsData.assignee_user_id === user.id ||
      taskExistsData.pegawai_id === user.id;

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get task details separately to avoid FK relationship errors
    const { data: task, error: taskError } = await svc
      .from("tasks")
      .select(
        `
        id,
        title,
        deskripsi_tugas,
        start_date,
        end_date,
        has_transport,
        transport_days,
        status,
        response_pegawai,
        created_at,
        updated_at,
        project_id
      `,
      )
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json(
        { error: "Failed to fetch task details" },
        { status: 500 },
      );
    }

    // Get project details separately
    const taskData = task as TaskData;
    const { data: project, error: projectError } = await svc
      .from("projects")
      .select("id, nama_project, deskripsi, status")
      .eq("id", taskData.project_id)
      .single();

    if (projectError) {
      return NextResponse.json(
        { error: "Failed to fetch project details" },
        { status: 500 },
      );
    }

    // Combine task and project data
    const projectData = project as ProjectData;
    const taskWithProject = {
      ...taskData,
      project: projectData,
    };

    return NextResponse.json({
      data: taskWithProject,
    });
  } catch (error) {
    console.error("Task GET API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id: taskId } = await params;
    type TasksUpdate = Database["public"]["Tables"]["tasks"]["Update"];
    const body: TasksUpdate = await request.json();

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Service client to avoid RLS issues
    const svc = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Verify task belongs to user (check both assignee_user_id and pegawai_id)
    const { data: task, error: taskError } = await svc
      .from("tasks")
      .select("id, assignee_user_id, pegawai_id")
      .eq("id", taskId)
      .or(`assignee_user_id.eq.${user.id},pegawai_id.eq.${user.id}`)
      .single();

    if (taskError || !task) {
      return NextResponse.json(
        { error: "Task not found or access denied" },
        { status: 404 },
      );
    }

    // Update task
    const updateFields: TasksUpdate = {
      updated_at: new Date().toISOString(),
    };

    if (body.status) {
      updateFields.status = body.status;
    }

    if (body.response_pegawai !== undefined) {
      updateFields.response_pegawai = body.response_pegawai;
    }

    const { data: updatedTask, error: updateError } = await svc
      .from("tasks")
      .update(updateFields as unknown as never)
      .eq("id", taskId)
      .select(
        `
        id,
        title,
        deskripsi_tugas,
        start_date,
        end_date,
        has_transport,
        status,
        response_pegawai,
        updated_at
      `,
      )
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      data: updatedTask,
      message: "Task updated successfully",
    });
  } catch (error) {
    console.error("Task Update API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
