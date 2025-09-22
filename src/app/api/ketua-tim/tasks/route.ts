// File: src/app/api/ketua-tim/tasks/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/../database/types/database.types";

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
    const svc = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const body = await request.json();
    // Accept both legacy and new task form shapes
    const normalized: TaskFormData = {
      project_id: body.project_id,
      pegawai_id: body.pegawai_id || body.assignee_user_id,
      tanggal_tugas: body.tanggal_tugas || body.start_date || body.end_date,
      deskripsi_tugas:
        body.deskripsi_tugas || body.description || body.title || "",
    };

    // Check if user is ketua tim
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Do not hard block by global role; we'll enforce ownership below

    // Validate required fields
    if (
      !normalized.project_id ||
      !normalized.pegawai_id ||
      !normalized.tanggal_tugas ||
      !normalized.deskripsi_tugas
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify project belongs to this ketua tim
    const { data: project, error: projectError } = await (svc as any)
      .from("projects")
      .select("id, ketua_tim_id, leader_user_id")
      .eq("id", normalized.project_id)
      .single();

    if (
      projectError ||
      !project ||
      ((project as any).ketua_tim_id !== user.id &&
        (project as any).leader_user_id !== user.id)
    ) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    // Verify pegawai is assigned to this project
    const { data: assignment, error: assignmentError } = await (svc as any)
      .from("project_assignments")
      .select("id")
      .eq("project_id", normalized.project_id)
      .eq("assignee_type", "pegawai")
      .eq("assignee_id", normalized.pegawai_id)
      .single();

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { error: "Pegawai is not assigned to this project" },
        { status: 400 }
      );
    }

    // Create task
    const { data: task, error: taskError } = await (svc as any)
      .from("tasks")
      .insert({
        project_id: normalized.project_id,
        pegawai_id: normalized.pegawai_id,
        assignee_user_id: normalized.pegawai_id, // Support both fields
        title: normalized.deskripsi_tugas,
        start_date: normalized.tanggal_tugas,
        end_date: normalized.tanggal_tugas,
        tanggal_tugas: normalized.tanggal_tugas,
        deskripsi_tugas: normalized.deskripsi_tugas,
        has_transport: body.has_transport || false,
        status: "pending",
      })
      .select()
      .single();

    if (taskError) {
      throw taskError;
    }

    // Transport allocation will be created automatically by trigger when has_transport = true

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
    const svc = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
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

    // No global role gate; enforce ownership in queries

    // Build task list WITHOUT relying on implicit foreign joins (avoid schema FK requirement)
    // 1) Find projects owned by the current user
    const ownedProjectsBase = (svc as any)
      .from("projects")
      .select("id")
      .or(`ketua_tim_id.eq.${user.id},leader_user_id.eq.${user.id}`);
    const { data: ownedProjects, error: ownedErr } = projectId
      ? await ownedProjectsBase.eq("id", projectId)
      : await ownedProjectsBase;
    if (ownedErr) throw ownedErr;
    const ownedProjectIds = (ownedProjects || []).map(
      (p: { id: string }) => p.id
    );

    if (ownedProjectIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // 2) Fetch tasks for these projects
    let taskQuery = (svc as any)
      .from("tasks")
      .select(
        `
        id,
        project_id,
        pegawai_id,
        title,
        tanggal_tugas,
        deskripsi_tugas,
        start_date,
        end_date,
        has_transport,
        status,
        response_pegawai,
        created_at,
        updated_at
      `
      )
      .in("project_id", ownedProjectIds)
      .order("tanggal_tugas", { ascending: false })
      .order("created_at", { ascending: false });

    if (status) taskQuery = taskQuery.eq("status", status);
    if (pegawaiId) taskQuery = taskQuery.eq("pegawai_id", pegawaiId);
    if (dateFrom) taskQuery = taskQuery.gte("tanggal_tugas", dateFrom);
    if (dateTo) taskQuery = taskQuery.lte("tanggal_tugas", dateTo);

    const { data: baseTasks, error: tasksErr } = await taskQuery;
    if (tasksErr) throw tasksErr;

    // 3) Enrich with project and user info
    const projectIds = Array.from(
      new Set((baseTasks || []).map((t: any) => t.project_id))
    );
    const userIds = Array.from(
      new Set((baseTasks || []).map((t: any) => t.pegawai_id))
    );

    const [{ data: projRows }, { data: userRows }] = await Promise.all([
      (svc as any)
        .from("projects")
        .select("id, nama_project")
        .in("id", projectIds),
      (svc as any)
        .from("users")
        .select("id, nama_lengkap, email")
        .in("id", userIds),
    ]);
    const idToProject = new Map<string, any>(
      (projRows || []).map((p: any) => [p.id, p])
    );
    const idToUser = new Map<string, any>(
      (userRows || []).map((u: any) => [u.id, u])
    );

    const enriched = (baseTasks || []).map((t: any) => ({
      ...t,
      projects: idToProject.get(t.project_id) || {
        id: t.project_id,
        nama_project: "",
      },
      users: idToUser.get(t.pegawai_id) || {
        id: t.pegawai_id,
        nama_lengkap: "",
        email: "",
      },
    }));

    return NextResponse.json({ data: enriched });
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
    const svc = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
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

    // No global role gate; enforce ownership below

    // Verify task belongs to a project owned by this ketua tim
    const { data: task, error: taskError } = await (svc as any)
      .from("tasks")
      .select(
        `
        id,
        projects:projects!inner (
          ketua_tim_id,
          leader_user_id
        )
      `
      )
      .eq("id", updateData.id)
      .or(`ketua_tim_id.eq.${user.id},leader_user_id.eq.${user.id}`, {
        foreignTable: "projects",
      })
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

    const { data: updatedTask, error: updateError } = await (svc as any)
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
    const svc = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
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

    // No global role gate; enforce ownership below

    // Verify task belongs to a project owned by this ketua tim
    const { data: task, error: taskError } = await (svc as any)
      .from("tasks")
      .select(
        `
        id,
        projects:projects!inner (ketua_tim_id, leader_user_id)
      `
      )
      .eq("id", taskId)
      .or(
        `projects.ketua_tim_id.eq.${user.id},projects.leader_user_id.eq.${user.id}`
      )
      .single();

    if (taskError || !task) {
      return NextResponse.json(
        { error: "Task not found or access denied" },
        { status: 404 }
      );
    }

    // Delete task
    const { error: deleteError } = await (svc as any)
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
