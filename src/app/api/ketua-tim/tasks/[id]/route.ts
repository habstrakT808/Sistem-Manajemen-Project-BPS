// File: src/app/api/ketua-tim/tasks/[id]/route.ts
// COMPLETELY UPDATED: Support new task structure with transport

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/../database/types/database.types";

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
  assignee_mitra_id?: string;
  assignee_type?: "member" | "mitra";
  description?: string;
  title?: string;
  start_date?: string;
  end_date?: string;
  has_transport?: boolean;
  transport_days?: number;
  honor_amount?: number;
};

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const svc = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
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
        { status: 404 },
      );
    }

    if (taskError || !task) {
      return NextResponse.json(
        { error: "Task not found or access denied" },
        { status: 404 },
      );
    }

    // Validate and process date fields
    let processedStartDate = null;
    let processedEndDate = null;

    if (body.start_date !== undefined) {
      if (body.start_date && body.start_date.trim() !== "") {
        processedStartDate = body.start_date;
      }
    }

    if (body.end_date !== undefined) {
      if (body.end_date && body.end_date.trim() !== "") {
        processedEndDate = body.end_date;
      }
    }

    // Validate date range if both dates are provided
    if (processedStartDate && processedEndDate) {
      if (new Date(processedStartDate) > new Date(processedEndDate)) {
        return NextResponse.json(
          { error: "Start date cannot be after end date" },
          { status: 400 },
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
      (updateFields as any).start_date = processedStartDate;
    if (body.end_date !== undefined)
      (updateFields as any).end_date = processedEndDate;
    if (body.status !== undefined) (updateFields as any).status = body.status;
    if (body.transport_days !== undefined)
      (updateFields as any).transport_days = body.transport_days;

    // Handle Mitra-specific fields
    if (body.assignee_type !== undefined) {
      // Note: assignee_type is not stored in tasks table, it's determined by which ID is set

      // Clear opposite assignee field based on type
      if (body.assignee_type === "mitra") {
        (updateFields as any).assignee_user_id = null;
        (updateFields as any).pegawai_id = null;
        if (body.assignee_mitra_id !== undefined) {
          (updateFields as any).assignee_mitra_id = body.assignee_mitra_id;
        }
      } else {
        (updateFields as any).assignee_mitra_id = null;
        if (body.assignee_user_id !== undefined) {
          (updateFields as any).assignee_user_id = body.assignee_user_id;
          (updateFields as any).pegawai_id = body.assignee_user_id;
        }
      }
    }

    if (body.honor_amount !== undefined) {
      (updateFields as any).honor_amount = body.honor_amount;
    }

    // Handle transport changes
    if (
      body.has_transport !== undefined &&
      body.has_transport !== (task as TaskData).has_transport
    ) {
      (updateFields as any).has_transport = body.has_transport;

      if (body.has_transport) {
        // Create transport allocations based on transport_days
        // Only pegawai can have transport, not Mitra
        const currentAssigneeType =
          body.assignee_type ||
          ((task as unknown as { assignee_mitra_id?: string }).assignee_mitra_id
            ? "mitra"
            : "member");
        if (currentAssigneeType === "mitra") {
          return NextResponse.json(
            { error: "Transport allocation is not available for Mitra tasks" },
            { status: 400 },
          );
        }

        const userIdParam =
          body.assignee_user_id ||
          (task as unknown as { assignee_user_id?: string }).assignee_user_id ||
          (task as unknown as { pegawai_id?: string }).pegawai_id ||
          null;
        if (!userIdParam) {
          return NextResponse.json(
            { error: "Task has no assigned user; cannot enable transport" },
            { status: 400 },
          );
        }

        // Get transport_days value (from body or existing task)
        const transportDays =
          body.transport_days !== undefined
            ? body.transport_days
            : (task as unknown as { transport_days?: number }).transport_days ||
              1;

        // First, cancel any existing allocations
        await (svc as any)
          .from("task_transport_allocations")
          .update({ canceled_at: new Date().toISOString() })
          .eq("task_id", taskId)
          .is("canceled_at", null);

        // Create new allocations based on transport_days
        if (transportDays > 0) {
          const transportAllocations = [];
          for (let i = 0; i < transportDays; i++) {
            transportAllocations.push({
              task_id: taskId,
              user_id: userIdParam,
              amount: 150000,
              created_by: user.id,
              created_at: new Date().toISOString(),
            });
          }

          const { error: transportError } = await (svc as any)
            .from("task_transport_allocations")
            .insert(transportAllocations);

          if (transportError) {
            console.error("Transport allocation error:", transportError);
          }
        }
      } else {
        // Cancel existing transport allocation
        const { error: cancelError } = await (svc as any)
          .from("task_transport_allocations")
          .update({ canceled_at: new Date().toISOString() })
          .eq("task_id", taskId)
          .is("canceled_at", null);

        if (cancelError) {
          console.error("Transport cancellation error:", cancelError);
        }
      }
    }

    // Handle transport_days changes when transport is already enabled
    if (
      body.transport_days !== undefined &&
      (task as TaskData).has_transport &&
      body.transport_days !==
        (task as unknown as { transport_days?: number }).transport_days
    ) {
      // Only pegawai can have transport, not Mitra
      const currentAssigneeType =
        body.assignee_type ||
        ((task as unknown as { assignee_mitra_id?: string }).assignee_mitra_id
          ? "mitra"
          : "member");
      if (currentAssigneeType === "mitra") {
        return NextResponse.json(
          { error: "Transport allocation is not available for Mitra tasks" },
          { status: 400 },
        );
      }

      const userIdParam =
        body.assignee_user_id ||
        (task as unknown as { assignee_user_id?: string }).assignee_user_id ||
        (task as unknown as { pegawai_id?: string }).pegawai_id ||
        null;

      if (userIdParam && body.transport_days > 0) {
        // Cancel existing allocations
        await (svc as any)
          .from("task_transport_allocations")
          .update({ canceled_at: new Date().toISOString() })
          .eq("task_id", taskId)
          .is("canceled_at", null);

        // Create new allocations based on new transport_days value
        const transportAllocations = [];
        for (let i = 0; i < body.transport_days; i++) {
          transportAllocations.push({
            task_id: taskId,
            user_id: userIdParam,
            amount: 150000,
            created_by: user.id,
            created_at: new Date().toISOString(),
          });
        }

        const { error: transportError } = await (svc as any)
          .from("task_transport_allocations")
          .insert(transportAllocations);

        if (transportError) {
          console.error("Transport allocation error:", transportError);
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
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const svc = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { id: taskId } = await params;

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use service client to bypass RLS policies
    const { data: queryResult, error: queryError } = await (svc as any)
      .from("tasks")
      .select("id, title, project_id")
      .eq("id", taskId)
      .single();

    if (queryError || !queryResult) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const task = queryResult;

    // Get project info separately
    const { data: projectResult, error: projectError } = await (svc as any)
      .from("projects")
      .select("id, leader_user_id, ketua_tim_id")
      .eq("id", task.project_id)
      .single();

    if (projectError || !projectResult) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const project = projectResult;

    // Check if user has access to this project

    const hasAccess =
      project.leader_user_id === user.id || project.ketua_tim_id === user.id;

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Cancel any transport allocations first
    const { data: allocations } = await (svc as any)
      .from("task_transport_allocations")
      .select("id")
      .eq("task_id", taskId);

    if (allocations && allocations.length > 0) {
      for (const allocation of allocations) {
        await (svc as any).rpc("cancel_transport_allocation", {
          allocation_id_param: (allocation as AllocationData).id,
        } as never);
      }
    }

    // Delete task
    const { error: deleteError } = await (svc as any)
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
      { status: 500 },
    );
  }
}
