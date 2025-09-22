// File: src/app/api/ketua-tim/tasks/[id]/transport/cancel/route.ts
// NEW: Cancel transport allocation (ketua tim only)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
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

    // Verify user is project leader
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select(
        `
        id,
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

    // Cancel transport allocation using function
    const { error: cancelError } = await supabase.rpc(
      "cancel_transport_allocation",
      {
        allocation_id_param: taskId, // Will find by task_id
      } as never
    );

    if (cancelError) {
      throw cancelError;
    }

    // Also update task to remove transport flag
    type TasksUpdate = Database["public"]["Tables"]["tasks"]["Update"];
    const updateData: TasksUpdate = { has_transport: false };
    const { error: updateError } = await supabase
      .from("tasks")
      .update(updateData as unknown as never)
      .eq("id", taskId);

    if (updateError) {
      console.error("Error updating task transport flag:", updateError);
    }

    return NextResponse.json({
      message: "Transport allocation canceled successfully",
    });
  } catch (error) {
    console.error("Cancel Transport API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
