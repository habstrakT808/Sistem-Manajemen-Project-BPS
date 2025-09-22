// File: src/app/api/ketua-tim/tasks/[id]/route.ts
// COMPLETELY UPDATED: Support new task structure with transport

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/../database/types/database.types";
/* eslint-disable @typescript-eslint/no-explicit-any */

interface TaskData {
  id: string;
  project_id: string;
  assignee_user_id: string;
  has_transport: boolean;
}

interface AllocationData {
  id: string;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

type TasksUpdate = Database["public"]["Tables"]["tasks"]["Update"];

type KetuaTimTaskUpdateData = TasksUpdate & {
  project_id?: string;
  assignee_user_id?: string;
  description?: string;
  title?: string;
  start_date?: string;
  end_date?: string;
  has_transport?: boolean;
};

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const svc = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { id: taskId } = await params;
    const body: KetuaTimTaskUpdateData = await request.json();

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify task ownership via service client to avoid RLS issues
    const { data: task, error: taskError } = await (svc as unknown as any)
      .from("tasks")
      .select("id, project_id, assignee_user_id, pegawai_id, has_transport")
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const { data: project, error: projErr } = await (svc as unknown as any)
      .from("projects")
      .select("id, leader_user_id, ketua_tim_id")
      .eq("id", (task as TaskData).project_id)
      .single();

    if (
      projErr ||
      !project ||
      ((project as { leader_user_id?: string; ketua_tim_id?: string })
        .leader_user_id !== user.id &&
        (project as { leader_user_id?: string; ketua_tim_id?: string })
          .ketua_tim_id !== user.id)
    ) {
      return NextResponse.json(
        { error: "Task not found or access denied" },
        { status: 404 }
      );
    }

    if (taskError || !task) {
      return NextResponse.json(
        { error: "Task not found or access denied" },
        { status: 404 }
      );
    }

    // Validate date range if provided
    if (body.start_date && body.end_date) {
      if (new Date(body.start_date) > new Date(body.end_date)) {
        return NextResponse.json(
          { error: "Start date cannot be after end date" },
          { status: 400 }
        );
      }
    }

    // Prepare update fields
    const updateFields: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.title !== undefined) (updateFields as any).title = body.title;
    if (body.description !== undefined)
      (updateFields as any).deskripsi_tugas = body.description;
    if (body.start_date !== undefined)
      (updateFields as any).start_date = body.start_date;
    if (body.end_date !== undefined)
      (updateFields as any).end_date = body.end_date;
    if (body.status !== undefined) (updateFields as any).status = body.status;

    // Handle transport changes
    if (
      body.has_transport !== undefined &&
      body.has_transport !== (task as TaskData).has_transport
    ) {
      (updateFields as any).has_transport = body.has_transport;

      if (body.has_transport) {
        // Create transport allocation
        const userIdParam =
          body.assignee_user_id ||
          (task as unknown as { assignee_user_id?: string }).assignee_user_id ||
          (task as unknown as { pegawai_id?: string }).pegawai_id ||
          null;
        if (!userIdParam) {
          return NextResponse.json(
            { error: "Task has no assigned user; cannot enable transport" },
            { status: 400 }
          );
        }
        await supabase.rpc("create_transport_allocation", {
          task_id_param: taskId,
          user_id_param: userIdParam,
        } as never);
      } else {
        // Cancel existing transport allocation
        const { data: allocation } = await supabase
          .from("task_transport_allocations")
          .select("id")
          .eq("task_id", taskId)
          .single();

        if (allocation) {
          await supabase.rpc("cancel_transport_allocation", {
            allocation_id_param: (allocation as AllocationData).id,
          } as never);
        }
      }
    }

    // Update task
    const { data: updatedTask, error: updateError } = await (svc as any)
      .from("tasks")
      .update(updateFields as any)
      .eq("id", taskId)
      .select("*")
      .single();

    if (updateError) {
      throw updateError;
    }

    // Log audit trail
    await (svc as any).from("audit_logs").insert({
      actor_user_id: user.id,
      action: "UPDATE",
      entity: "tasks",
      entity_id: taskId,
      before_data: task as unknown as Record<string, unknown>,
      after_data: updatedTask as unknown as Record<string, unknown>,
    } as never);

    return NextResponse.json({
      data: updatedTask,
      message: "Task updated successfully",
    });
  } catch (error) {
    console.error("Task Update API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // Verify task ownership through project leadership
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select(
        `
        id,
        title,
        projects!inner (
          leader_user_id
        )
      `
      )
      .eq("id", taskId)
      .eq("projects.leader_user_id", user.id)
      .single();

    if (taskError || !task) {
      return NextResponse.json(
        { error: "Task not found or access denied" },
        { status: 404 }
      );
    }

    // Cancel any transport allocations first
    const { data: allocations } = await supabase
      .from("task_transport_allocations")
      .select("id")
      .eq("task_id", taskId);

    if (allocations && allocations.length > 0) {
      for (const allocation of allocations) {
        await supabase.rpc("cancel_transport_allocation", {
          allocation_id_param: (allocation as AllocationData).id,
        } as never);
      }
    }

    // Delete task
    const { error: deleteError } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId);

    if (deleteError) {
      throw deleteError;
    }

    // Log audit trail
    await supabase.from("audit_logs").insert({
      actor_user_id: user.id,
      action: "DELETE",
      entity: "tasks",
      entity_id: taskId,
      before_data: task as unknown as Record<string, unknown>,
    } as never);

    return NextResponse.json({
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Task Delete API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
