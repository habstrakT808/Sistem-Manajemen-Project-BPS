import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function POST(_request: NextRequest) {
  try {
    console.log("🔧 [FIX-TASK] Task allocation fix API called!");

    // Use service client to bypass RLS
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const taskId = "56c3b151-a284-483c-81d2-d91759814ed2"; // Task ID from investigation

    // Get task details first
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("id, title, transport_days")
      .eq("id", taskId)
      .single();

    if (taskError) {
      console.error("🔧 [FIX-TASK] Error fetching task:", taskError);
      throw taskError;
    }

    console.log(
      "🔧 [FIX-TASK] Task:",
      task.title,
      "should have",
      task.transport_days,
      "allocations",
    );

    // Get all active allocations for this task
    const { data: allocations, error: allocationsError } = await supabase
      .from("task_transport_allocations")
      .select("*")
      .eq("task_id", taskId)
      .is("canceled_at", null)
      .order("created_at", { ascending: true });

    if (allocationsError) {
      console.error(
        "🔧 [FIX-TASK] Error fetching allocations:",
        allocationsError,
      );
      throw allocationsError;
    }

    console.log(
      "🔧 [FIX-TASK] Found",
      allocations?.length || 0,
      "active allocations",
    );

    if (!allocations || allocations.length <= task.transport_days) {
      return NextResponse.json({
        success: true,
        message: "No excess allocations found",
        current_count: allocations?.length || 0,
        expected_count: task.transport_days,
      });
    }

    // Delete the excess allocations (keep only the required number)
    const excessAllocations = allocations.slice(task.transport_days); // Get allocations beyond the required number
    const allocationIdsToDelete = excessAllocations.map((a) => a.id);

    console.log(
      "🔧 [FIX-TASK] Deleting",
      allocationIdsToDelete.length,
      "excess allocations",
    );

    // Delete excess allocations
    const { error: deleteError } = await supabase
      .from("task_transport_allocations")
      .delete()
      .in("id", allocationIdsToDelete);

    if (deleteError) {
      console.error("🔧 [FIX-TASK] Error deleting allocations:", deleteError);
      throw deleteError;
    }

    // Also delete related earnings ledger entries
    const { error: earningsDeleteError } = await supabase
      .from("earnings_ledger")
      .delete()
      .in("allocation_id", allocationIdsToDelete);

    if (earningsDeleteError) {
      console.error(
        "🔧 [FIX-TASK] Error deleting earnings:",
        earningsDeleteError,
      );
      // Don't throw here, just log the error
    }

    console.log(
      "🔧 [FIX-TASK] Successfully fixed allocations for task:",
      task.title,
    );

    return NextResponse.json({
      success: true,
      message: `Fixed task '${task.title}' - deleted ${allocationIdsToDelete.length} excess allocations`,
      task_title: task.title,
      deleted_allocation_ids: allocationIdsToDelete,
      remaining_count: task.transport_days,
      expected_amount: task.transport_days * 150000,
    });
  } catch (error) {
    console.error("🔧 [FIX-TASK] Task fix error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to fix task allocations",
      },
      { status: 500 },
    );
  }
}
