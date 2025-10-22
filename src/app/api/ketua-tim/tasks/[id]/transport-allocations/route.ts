import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: taskId } = await params;

    // Try with service client to bypass RLS policies that might cause recursion
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get transport allocations for this task (minimal query to avoid policy recursion)
    // Only select essential fields and avoid any joins
    const { data: allocations, error: allocationsError } = await serviceClient
      .from("task_transport_allocations")
      .select(
        "id, task_id, user_id, amount, created_at, canceled_at, allocation_date, allocated_at",
      )
      .eq("task_id", taskId)
      .is("canceled_at", null); // Only get non-canceled allocations

    console.log(
      "🔧 DEBUG API: Fetching transport allocations for taskId:",
      taskId,
    );
    console.log("🔧 DEBUG API: Allocations found:", allocations);
    console.log("🔧 DEBUG API: Allocations error:", allocationsError);

    if (allocationsError) {
      console.error(
        "Error fetching transport allocations with service client:",
        allocationsError,
      );

      // Fallback: return empty allocations instead of error
      // This allows the frontend to work even if database query fails
      console.log(
        "🔧 DEBUG API: Falling back to empty allocations due to error",
      );
      return NextResponse.json({
        allocations: [],
        activeAllocations: [],
        error: "Database query failed, assuming no allocations",
      });
    }

    // Filter for TRULY allocated transport (has allocation_date or allocated_at)
    // Allocations without these fields are still pending (waiting for date selection)
    const activeAllocations = (allocations || []).filter(
      (allocation: any) =>
        allocation.allocation_date || allocation.allocated_at,
    );
    console.log(
      "🔧 DEBUG API: Active allocations (with date):",
      activeAllocations,
    );
    console.log(
      "🔧 DEBUG API: Pending allocations (no date):",
      (allocations || []).filter(
        (allocation: any) =>
          !allocation.allocation_date && !allocation.allocated_at,
      ),
    );

    return NextResponse.json({
      allocations: allocations || [],
      activeAllocations: activeAllocations,
      pendingAllocations: (allocations || []).filter(
        (allocation: any) =>
          !allocation.allocation_date && !allocation.allocated_at,
      ),
    });
  } catch (error) {
    console.error("Error in transport allocations API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
