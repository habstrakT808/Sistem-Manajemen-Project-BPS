import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function POST(_request: NextRequest) {
  try {
    console.log("🔧 [FIX] Starting Task 4 allocation cleanup...");

    // Use service client to bypass RLS
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // 1. Get Task 4 data
    const { data: task4Data, error: taskError } = await supabase
      .from("tasks")
      .select("id, title, transport_days")
      .ilike("title", "%Tes task 4%")
      .single();

    if (taskError || !task4Data) {
      console.error("🔧 [FIX] Task 4 not found:", taskError);
      return NextResponse.json(
        {
          success: false,
          error: "Task 4 not found",
        },
        { status: 404 },
      );
    }

    console.log("🔧 [FIX] Found Task 4:", task4Data);

    // 2. Get all allocations for Task 4
    const { data: allocations, error: allocError } = await supabase
      .from("task_transport_allocations")
      .select("id, created_at, allocation_date, canceled_at")
      .eq("task_id", task4Data.id)
      .is("canceled_at", null)
      .order("created_at", { ascending: true });

    if (allocError) {
      console.error("🔧 [FIX] Error fetching allocations:", allocError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch allocations",
        },
        { status: 500 },
      );
    }

    console.log("🔧 [FIX] Found allocations:", allocations?.length || 0);
    console.log("🔧 [FIX] Expected allocations:", task4Data.transport_days);

    // 3. Check if cleanup is needed
    const currentCount = allocations?.length || 0;
    const expectedCount = task4Data.transport_days || 0;

    if (currentCount <= expectedCount) {
      return NextResponse.json({
        success: true,
        message: `Task 4 already has correct allocation count (${currentCount}/${expectedCount})`,
        data: {
          task_id: task4Data.id,
          task_title: task4Data.title,
          current_count: currentCount,
          expected_count: expectedCount,
          action: "no_cleanup_needed",
        },
      });
    }

    // 4. Cancel excess allocations (keep the oldest ones, cancel the newest)
    const excessCount = currentCount - expectedCount;
    const allocationsToCancel = allocations!.slice(-excessCount); // Get the newest ones

    console.log("🔧 [FIX] Canceling", excessCount, "excess allocations");

    for (const allocation of allocationsToCancel) {
      const { error: cancelError } = await supabase
        .from("task_transport_allocations")
        .update({ canceled_at: new Date().toISOString() })
        .eq("id", allocation.id);

      if (cancelError) {
        console.error(
          "🔧 [FIX] Error canceling allocation:",
          allocation.id,
          cancelError,
        );
      } else {
        console.log("🔧 [FIX] Canceled allocation:", allocation.id);
      }
    }

    // 5. Verify the fix
    const { data: finalAllocations } = await supabase
      .from("task_transport_allocations")
      .select("id")
      .eq("task_id", task4Data.id)
      .is("canceled_at", null);

    const finalCount = finalAllocations?.length || 0;

    return NextResponse.json({
      success: true,
      message: `Task 4 allocation cleanup completed`,
      data: {
        task_id: task4Data.id,
        task_title: task4Data.title,
        before_count: currentCount,
        after_count: finalCount,
        expected_count: expectedCount,
        canceled_count: excessCount,
        action: "cleanup_completed",
      },
    });
  } catch (error) {
    console.error("🔧 [FIX] Task 4 cleanup error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to cleanup Task 4 allocations",
      },
      { status: 500 },
    );
  }
}
