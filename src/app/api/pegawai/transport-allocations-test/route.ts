import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function GET(_request: NextRequest) {
  try {
    console.log("🔍 [DEBUG] Transport allocations test API called!");

    // Use service client to bypass RLS
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Skip auth for testing - use a hardcoded user ID
    const testUserId = "57bf81a6-9278-47c4-9800-9d1999915eb9"; // Use the same test user ID from other routes
    console.log("🔍 [DEBUG] Using test user ID:", testUserId);

    // Get transport allocations for the test user
    console.log("🔍 [DEBUG] Fetching transport allocations");
    const { data: allocations, error } = await supabase
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
      .eq("user_id", testUserId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("🔍 [DEBUG] Error fetching transport allocations:", error);
      throw error;
    }

    console.log(
      "🔍 [DEBUG] Found transport allocations:",
      allocations?.length || 0,
    );

    // Get task details for each allocation
    const transformedAllocations = [];
    if (allocations && allocations.length > 0) {
      for (const allocation of allocations) {
        // Get task details
        const { data: task, error: taskError } = await supabase
          .from("tasks")
          .select("title, start_date, end_date, project_id")
          .eq("id", allocation.task_id)
          .single();

        if (taskError) {
          console.error("🔍 [DEBUG] Error fetching task:", taskError);
          continue;
        }

        // Get project details
        const { data: project, error: projectError } = await supabase
          .from("projects")
          .select("nama_project")
          .eq("id", task.project_id)
          .single();

        if (projectError) {
          console.error("🔍 [DEBUG] Error fetching project:", projectError);
          continue;
        }

        transformedAllocations.push({
          id: allocation.id,
          task_id: allocation.task_id,
          amount: allocation.amount,
          allocation_date: allocation.allocation_date,
          allocated_at: allocation.allocated_at,
          canceled_at: allocation.canceled_at,
          task: {
            title: task.title || "Test Task",
            project_name: project.nama_project || "Test Project",
            start_date: task.start_date,
            end_date: task.end_date,
          },
        });
      }
    }

    // Group allocations by status for debugging
    const allocated = transformedAllocations.filter(
      (a) => a.allocated_at && !a.canceled_at,
    );
    const pending = transformedAllocations.filter(
      (a) => !a.allocated_at && !a.canceled_at,
    );
    const canceled = transformedAllocations.filter((a) => a.canceled_at);

    console.log("🔍 [DEBUG] Allocated allocations:", allocated.length);
    console.log("🔍 [DEBUG] Pending allocations:", pending.length);
    console.log("🔍 [DEBUG] Canceled allocations:", canceled.length);

    return NextResponse.json({
      success: true,
      data: transformedAllocations,
      debug: {
        userId: testUserId,
        totalAllocations: transformedAllocations.length,
        allocatedCount: allocated.length,
        pendingCount: pending.length,
        canceledCount: canceled.length,
        allocations: transformedAllocations,
      },
    });
  } catch (error) {
    console.error("🔍 [DEBUG] Transport allocations test error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        debug: {
          message: "Failed to fetch transport allocations",
        },
      },
      { status: 500 },
    );
  }
}
