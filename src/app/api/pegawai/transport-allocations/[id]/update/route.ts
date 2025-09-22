import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/../database/types/database.types";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { id: allocationId } = await params;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { allocation_date } = await request.json();

    if (!allocation_date) {
      return NextResponse.json(
        { error: "Allocation date is required" },
        { status: 400 }
      );
    }

    // Verify the allocation belongs to the user and get task details
    const { data: allocation, error: allocationError } = await serviceClient
      .from("task_transport_allocations")
      .select(
        `
        id, 
        user_id, 
        allocation_date,
        task_id,
        task:tasks (
          start_date,
          end_date
        )
      `
      )
      .eq("id", allocationId)
      .eq("user_id", user.id)
      .single();

    if (allocationError || !allocation) {
      return NextResponse.json(
        { error: "Transport allocation not found or access denied" },
        { status: 404 }
      );
    }

    if (!(allocation as any).allocation_date) {
      return NextResponse.json(
        { error: "Transport allocation is not yet allocated" },
        { status: 400 }
      );
    }

    // Validate that new allocation date is within task date range
    const taskData = (allocation as any).task as any;
    if (taskData && taskData.start_date && taskData.end_date) {
      const newAllocationDate = new Date(allocation_date);
      const taskStartDate = new Date(taskData.start_date);
      const taskEndDate = new Date(taskData.end_date);

      if (
        newAllocationDate < taskStartDate ||
        newAllocationDate > taskEndDate
      ) {
        return NextResponse.json(
          {
            error: `Allocation date must be within task date range (${taskData.start_date} to ${taskData.end_date})`,
          },
          { status: 400 }
        );
      }
    }

    // Check if the new date is already allocated by the same user (excluding current allocation)
    const { data: existingAllocation, error: checkError } = await serviceClient
      .from("task_transport_allocations")
      .select("id")
      .eq("user_id", user.id)
      .eq("allocation_date", allocation_date)
      .neq("id", allocationId)
      .is("canceled_at", null)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116 = no rows returned
      console.error("Error checking existing allocation:", checkError);
      return NextResponse.json(
        { error: "Failed to validate allocation date" },
        { status: 500 }
      );
    }

    if (existingAllocation) {
      return NextResponse.json(
        {
          error: `Tanggal ${new Date(allocation_date).toLocaleDateString("id-ID")} sudah terisi. Silakan pilih tanggal lain.`,
        },
        { status: 400 }
      );
    }

    // Update the allocation with the new date
    const { error: updateError } = await (serviceClient as any)
      .from("task_transport_allocations")
      .update({
        allocation_date: allocation_date,
        allocated_at: new Date().toISOString(),
      })
      .eq("id", allocationId);

    if (updateError) {
      console.error("Error updating allocation:", updateError);
      return NextResponse.json(
        { error: "Failed to update transport allocation" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Transport allocation updated successfully",
      allocation_date: allocation_date,
    });
  } catch (error) {
    console.error("Update transport allocation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
