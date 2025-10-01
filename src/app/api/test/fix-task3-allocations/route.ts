import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function POST(_request: NextRequest) {
  try {
    console.log("🔧 [FIX] Fixing Task 3 transport allocations");

    // Use service client to bypass RLS
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const taskId = "cc6e5ec2-18e5-4688-808b-5459b81cb3dd"; // Task 3 ID

    // Get all allocations for Task 3
    const { data: allocations, error: fetchError } = await supabase
      .from("task_transport_allocations")
      .select("id, created_at")
      .eq("task_id", taskId)
      .is("canceled_at", null)
      .order("created_at", { ascending: true });

    if (fetchError) {
      throw fetchError;
    }

    console.log("🔧 [FIX] Found allocations:", allocations?.length);

    if (!allocations || allocations.length <= 2) {
      return NextResponse.json({
        success: true,
        message: "No excess allocations to remove",
        allocations_count: allocations?.length || 0,
      });
    }

    // Remove the newest allocation (keep the first 2)
    const allocationToRemove = allocations[allocations.length - 1];

    const { error: deleteError } = await supabase
      .from("task_transport_allocations")
      .update({ canceled_at: new Date().toISOString() })
      .eq("id", allocationToRemove.id);

    if (deleteError) {
      throw deleteError;
    }

    console.log("🔧 [FIX] Removed allocation:", allocationToRemove.id);

    // Verify the fix
    const { data: remainingAllocations, error: verifyError } = await supabase
      .from("task_transport_allocations")
      .select("id")
      .eq("task_id", taskId)
      .is("canceled_at", null);

    if (verifyError) {
      throw verifyError;
    }

    return NextResponse.json({
      success: true,
      message: "Successfully fixed Task 3 transport allocations",
      removed_allocation_id: allocationToRemove.id,
      remaining_allocations: remainingAllocations?.length || 0,
      expected_allocations: 2,
    });
  } catch (error) {
    console.error("🔧 [FIX] Error fixing Task 3 allocations:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to fix Task 3 allocations",
      },
      { status: 500 },
    );
  }
}
