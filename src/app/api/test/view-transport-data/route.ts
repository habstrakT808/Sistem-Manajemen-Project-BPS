import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function GET(_request: NextRequest) {
  try {
    console.log("🔍 [VIEW] Transport data view API called!");

    // Use service client to bypass RLS
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get all tasks with transport
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
        project_id
      `,
      )
      .eq("has_transport", true)
      .order("created_at", { ascending: false });

    if (tasksError) {
      console.error("🔍 [VIEW] Error fetching tasks:", tasksError);
      throw tasksError;
    }

    // Get all transport allocations
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
      .is("canceled_at", null)
      .order("created_at", { ascending: false });

    if (allocationsError) {
      console.error("🔍 [VIEW] Error fetching allocations:", allocationsError);
      throw allocationsError;
    }

    // Group allocations by task
    const allocationsByTask = (allocations || []).reduce(
      (acc: any, allocation: any) => {
        if (!acc[allocation.task_id]) {
          acc[allocation.task_id] = [];
        }
        acc[allocation.task_id].push(allocation);
        return acc;
      },
      {},
    );

    // Combine data
    const result = (tasks || []).map((task: any) => ({
      task: {
        id: task.id,
        title: task.title,
        has_transport: task.has_transport,
        transport_days: task.transport_days,
        start_date: task.start_date,
        end_date: task.end_date,
        assignee_user_id: task.assignee_user_id,
        project_id: task.project_id,
      },
      allocations: allocationsByTask[task.id] || [],
      allocation_count: (allocationsByTask[task.id] || []).length,
      expected_count: task.transport_days || 1,
    }));

    console.log("🔍 [VIEW] Found", tasks?.length || 0, "tasks with transport");

    return NextResponse.json({
      success: true,
      message: `Found ${tasks?.length || 0} tasks with transport`,
      data: result,
      summary: {
        total_tasks: tasks?.length || 0,
        total_allocations: allocations?.length || 0,
      },
    });
  } catch (error) {
    console.error("🔍 [VIEW] Transport view error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to view transport data",
      },
      { status: 500 },
    );
  }
}
