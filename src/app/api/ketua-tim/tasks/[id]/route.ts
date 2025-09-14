// File: src/app/api/ketua-tim/tasks/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

interface TaskUpdateData {
  project_id: string;
  pegawai_id: string;
  tanggal_tugas: string;
  deskripsi_tugas: string;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = (await createClient()) as SupabaseClient;
    const { id: taskId } = await params;
    const body: TaskUpdateData = await request.json();

    // Auth check - ketua tim only
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          code: "AUTH_REQUIRED",
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    // Verify user role
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
      return NextResponse.json(
        {
          error: "Forbidden",
          code: "INSUFFICIENT_PERMISSIONS",
          required_role: "ketua_tim",
        },
        { status: 403 }
      );
    }

    // Verify task ownership through project
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select(
        `
        id,
        projects!inner (
          id,
          ketua_tim_id
        )
      `
      )
      .eq("id", taskId)
      .eq("projects.ketua_tim_id", user.id)
      .single();

    if (taskError || !task) {
      return NextResponse.json(
        {
          error: "Task not found or access denied",
          code: "TASK_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // Update task
    const { data: updatedTask, error: updateError } = await supabase
      .from("tasks")
      .update({
        project_id: body.project_id,
        pegawai_id: body.pegawai_id,
        tanggal_tugas: body.tanggal_tugas,
        deskripsi_tugas: body.deskripsi_tugas,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId)
      .select(
        `
        id,
        project_id,
        pegawai_id,
        tanggal_tugas,
        deskripsi_tugas,
        status,
        response_pegawai,
        created_at,
        updated_at,
        projects (
          id,
          nama_project
        ),
        users (
          id,
          nama_lengkap,
          email
        )
      `
      )
      .single();

    if (updateError) {
      console.error("Task update error:", updateError);
      throw updateError;
    }

    return NextResponse.json({
      data: updatedTask,
      meta: {
        timestamp: new Date().toISOString(),
        task_id: taskId,
      },
    });
  } catch (error) {
    console.error("Task Update API Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = (await createClient()) as SupabaseClient;
    const { id: taskId } = await params;

    // Auth check - ketua tim only
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          code: "AUTH_REQUIRED",
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    // Verify user role
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
      return NextResponse.json(
        {
          error: "Forbidden",
          code: "INSUFFICIENT_PERMISSIONS",
          required_role: "ketua_tim",
        },
        { status: 403 }
      );
    }

    // Verify task ownership through project
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select(
        `
        id,
        projects!inner (
          id,
          ketua_tim_id
        )
      `
      )
      .eq("id", taskId)
      .eq("projects.ketua_tim_id", user.id)
      .single();

    if (taskError || !task) {
      return NextResponse.json(
        {
          error: "Task not found or access denied",
          code: "TASK_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // Delete task
    const { error: deleteError } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId);

    if (deleteError) {
      console.error("Task delete error:", deleteError);
      throw deleteError;
    }

    return NextResponse.json({
      message: "Task deleted successfully",
      meta: {
        timestamp: new Date().toISOString(),
        task_id: taskId,
      },
    });
  } catch (error) {
    console.error("Task Delete API Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
