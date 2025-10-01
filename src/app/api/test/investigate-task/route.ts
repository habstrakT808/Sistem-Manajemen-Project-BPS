import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function GET(_request: NextRequest) {
  try {
    console.log("🔍 [INVESTIGATE] Task investigation API called!");

    // Use service client to bypass RLS
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Find task by title
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select(
        `
        id, 
        title, 
        has_transport, 
        transport_days,
        start_date,
        end_date,
        assignee_user_id,
        project_id,
        created_at
      `,
      )
      .ilike("title", "%Tes Task Title 2%")
      .order("created_at", { ascending: false });

    if (tasksError) {
      console.error("🔍 [INVESTIGATE] Error fetching tasks:", tasksError);
      throw tasksError;
    }

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({
        success: false,
        message: "Task 'Tes Task Title 2' not found",
      });
    }

    const task = tasks[0]; // Get the most recent one
    console.log(
      "🔍 [INVESTIGATE] Found task:",
      task.id,
      "with transport_days:",
      task.transport_days,
    );

    // Get all transport allocations for this task
    const { data: allocations, error: allocationsError } = await supabase
      .from("task_transport_allocations")
      .select(
        `
        id,
        task_id,
        user_id,
        amount,
        allocation_date,
        allocated_at,
        canceled_at,
        created_at
      `,
      )
      .eq("task_id", task.id)
      .order("created_at", { ascending: false });

    if (allocationsError) {
      console.error(
        "🔍 [INVESTIGATE] Error fetching allocations:",
        allocationsError,
      );
      throw allocationsError;
    }

    // Filter active allocations (not canceled)
    const activeAllocations = (allocations || []).filter((a) => !a.canceled_at);
    const canceledAllocations = (allocations || []).filter(
      (a) => a.canceled_at,
    );

    console.log(
      "🔍 [INVESTIGATE] Found",
      activeAllocations.length,
      "active allocations",
    );
    console.log(
      "🔍 [INVESTIGATE] Found",
      canceledAllocations.length,
      "canceled allocations",
    );

    return NextResponse.json({
      success: true,
      message: `Found task '${task.title}' with ${activeAllocations.length} active allocations`,
      data: {
        task: task,
        active_allocations: activeAllocations,
        canceled_allocations: canceledAllocations,
        summary: {
          expected_transport_days: task.transport_days,
          actual_active_allocations: activeAllocations.length,
          total_amount: activeAllocations.reduce(
            (sum, a) => sum + (a.amount || 0),
            0,
          ),
          mismatch: task.transport_days !== activeAllocations.length,
        },
      },
    });
  } catch (error) {
    console.error("🔍 [INVESTIGATE] Investigation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to investigate task",
      },
      { status: 500 },
    );
  }
}
