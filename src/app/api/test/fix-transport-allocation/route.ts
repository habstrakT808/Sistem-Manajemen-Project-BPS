import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function POST(_request: NextRequest) {
  try {
    console.log("🔧 [FIX] Transport allocation fix API called!");

    // Use service client to bypass RLS
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const taskId = "a116f824-7136-489f-8761-fc347110b40b";

    // Get all allocations for this task
    const { data: allocations, error: allocationsError } = await supabase
      .from("task_transport_allocations")
      .select("*")
      .eq("task_id", taskId)
      .is("canceled_at", null)
      .order("created_at", { ascending: true });

    if (allocationsError) {
      console.error("🔧 [FIX] Error fetching allocations:", allocationsError);
      throw allocationsError;
    }

    console.log(
      "🔧 [FIX] Found",
      allocations?.length || 0,
      "allocations for task",
    );

    if (!allocations || allocations.length <= 3) {
      return NextResponse.json({
        success: true,
        message: "No excess allocations found",
        current_count: allocations?.length || 0,
      });
    }

    // Delete the excess allocations (keep only 3, delete the rest)
    const excessAllocations = allocations.slice(3); // Get allocations beyond the first 3
    const allocationIdsToDelete = excessAllocations.map((a) => a.id);

    console.log(
      "🔧 [FIX] Deleting",
      allocationIdsToDelete.length,
      "excess allocations",
    );

    // Delete excess allocations
    const { error: deleteError } = await supabase
      .from("task_transport_allocations")
      .delete()
      .in("id", allocationIdsToDelete);

    if (deleteError) {
      console.error("🔧 [FIX] Error deleting allocations:", deleteError);
      throw deleteError;
    }

    // Also delete related earnings ledger entries
    const { error: earningsDeleteError } = await supabase
      .from("earnings_ledger")
      .delete()
      .in("allocation_id", allocationIdsToDelete);

    if (earningsDeleteError) {
      console.error("🔧 [FIX] Error deleting earnings:", earningsDeleteError);
      // Don't throw here, just log the error
    }

    console.log(
      "🔧 [FIX] Successfully deleted",
      allocationIdsToDelete.length,
      "excess allocations",
    );

    return NextResponse.json({
      success: true,
      message: `Fixed transport allocations - deleted ${allocationIdsToDelete.length} excess allocations`,
      deleted_allocation_ids: allocationIdsToDelete,
      remaining_count: 3,
    });
  } catch (error) {
    console.error("🔧 [FIX] Transport fix error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to fix transport allocations",
      },
      { status: 500 },
    );
  }
}
