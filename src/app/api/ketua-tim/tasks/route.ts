// File: src/app/api/ketua-tim/tasks/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface TaskFormData {
  project_id: string;
  pegawai_id: string;
  tanggal_tugas: string;
  deskripsi_tugas: string;
}

interface TaskUpdateData {
  id: string;
  deskripsi_tugas?: string;
  tanggal_tugas?: string;
  status?: "pending" | "in_progress" | "completed";
  response_pegawai?: string;
}

export async function POST(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createClient()) as any;
    const body = await request.json();
    const taskData: TaskFormData = body;

    // Check if user is ketua tim
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !userProfile ||
      (userProfile as { role: string }).role !== "ketua_tim"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate required fields
    if (
      !taskData.project_id ||
      !taskData.pegawai_id ||
      !taskData.tanggal_tugas ||
      !taskData.deskripsi_tugas
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify project belongs to this ketua tim
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", taskData.project_id)
      .eq("ketua_tim_id", user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    // Verify pegawai is assigned to this project
    const { data: assignment, error: assignmentError } = await supabase
      .from("project_assignments")
      .select("id")
      .eq("project_id", taskData.project_id)
      .eq("assignee_type", "pegawai")
      .eq("assignee_id", taskData.pegawai_id)
      .single();

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { error: "Pegawai is not assigned to this project" },
        { status: 400 }
      );
    }

    // Create task
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .insert({
        project_id: taskData.project_id,
        pegawai_id: taskData.pegawai_id,
        tanggal_tugas: taskData.tanggal_tugas,
        deskripsi_tugas: taskData.deskripsi_tugas,
        status: "pending",
      })
      .select()
      .single();

    if (taskError) {
      throw taskError;
    }

    return NextResponse.json({
      message: "Task created successfully",
      task,
    });
  } catch (error) {
    console.error("Task creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createClient()) as any;
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id");
    const status = searchParams.get("status");
    const pegawaiId = searchParams.get("pegawai_id");
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");

    // Check if user is ketua tim
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !userProfile ||
      (userProfile as { role: string }).role !== "ketua_tim"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Build query for tasks from projects owned by this ketua tim
    let query = supabase
      .from("tasks")
      .select(
        `
        *,
        projects!inner (
          id,
          nama_project,
          ketua_tim_id
        ),
        users!inner (
          id,
          nama_lengkap,
          email
        )
      `
      )
      .eq("projects.ketua_tim_id", user.id)
      .order("tanggal_tugas", { ascending: false })
      .order("created_at", { ascending: false });

    // Apply filters
    if (projectId) {
      query = query.eq("project_id", projectId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (pegawaiId) {
      query = query.eq("pegawai_id", pegawaiId);
    }

    if (dateFrom) {
      query = query.gte("tanggal_tugas", dateFrom);
    }

    if (dateTo) {
      query = query.lte("tanggal_tugas", dateTo);
    }

    const { data: tasks, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ data: tasks || [] });
  } catch (error) {
    console.error("Tasks fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createClient()) as any;
    const body = await request.json();
    const updateData: TaskUpdateData = body;

    // Check if user is ketua tim
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !userProfile ||
      (userProfile as { role: string }).role !== "ketua_tim"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify task belongs to a project owned by this ketua tim
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select(
        `
        id,
        projects!inner (
          ketua_tim_id
        )
      `
      )
      .eq("id", updateData.id)
      .eq("projects.ketua_tim_id", user.id)
      .single();

    if (taskError || !task) {
      return NextResponse.json(
        { error: "Task not found or access denied" },
        { status: 404 }
      );
    }

    // Update task
    const updateFields: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updateData.deskripsi_tugas) {
      updateFields.deskripsi_tugas = updateData.deskripsi_tugas;
    }

    if (updateData.tanggal_tugas) {
      updateFields.tanggal_tugas = updateData.tanggal_tugas;
    }

    if (updateData.status) {
      updateFields.status = updateData.status;
    }

    if (updateData.response_pegawai !== undefined) {
      updateFields.response_pegawai = updateData.response_pegawai;
    }

    const { data: updatedTask, error: updateError } = await supabase
      .from("tasks")
      .update(updateFields)
      .eq("id", updateData.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      message: "Task updated successfully",
      task: updatedTask,
    });
  } catch (error) {
    console.error("Task update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createClient()) as any;
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("id");

    if (!taskId) {
      return NextResponse.json(
        { error: "Task ID is required" },
        { status: 400 }
      );
    }

    // Check if user is ketua tim
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !userProfile ||
      (userProfile as { role: string }).role !== "ketua_tim"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify task belongs to a project owned by this ketua tim
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select(
        `
        id,
        projects!inner (
          ketua_tim_id
        )
      `
      )
      .eq("id", taskId)
      .eq("projects.ketua_tim_id", user.id)
      .single();

    if (taskError || !task) {
      return NextResponse.json(
        { error: "Task not found or access denied" },
        { status: 404 }
      );
    }

    // Delete task
    const { error: deleteError } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Task deletion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
