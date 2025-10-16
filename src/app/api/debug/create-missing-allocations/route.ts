import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/../database/types/database.types";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("task_id");

    const serviceClient = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!taskId) {
      return NextResponse.json(
        { error: "task_id is required" },
        { status: 400 },
      );
    }

    // Get task details
    const { data: task, error: taskError } = await serviceClient
      .from("tasks")
      .select(
        `
        id,
        title,
        project_id,
        assignee_user_id,
        pegawai_id,
        satuan_id,
        rate_per_satuan,
        volume,
        total_amount
      `,
      )
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Check if task belongs to user
    const isUserTask =
      (task as any).assignee_user_id === user.id ||
      (task as any).pegawai_id === user.id;
    if (!isUserTask) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Check if allocations already exist
    const { data: existingAllocations, error: existingError } =
      await serviceClient
        .from("task_transport_allocations")
        .select("id")
        .eq("task_id", taskId)
        .eq("user_id", user.id);

    if (existingError) {
      console.error("Error checking existing allocations:", existingError);
      return NextResponse.json(
        { error: "Failed to check existing allocations" },
        { status: 500 },
      );
    }

    if (existingAllocations && existingAllocations.length > 0) {
      return NextResponse.json({
        message: "Allocations already exist",
        existing_count: existingAllocations.length,
      });
    }

    // Create allocations based on satuan system
    if (
      (task as any).satuan_id &&
      (task as any).volume &&
      (task as any).volume > 0
    ) {
      const transportAllocations = [];
      const amountPerAllocation = (task as any).rate_per_satuan || 0;

      for (let i = 0; i < (task as any).volume; i++) {
        transportAllocations.push({
          task_id: (task as any).id,
          user_id: user.id,
          amount: amountPerAllocation,
          created_by: user.id,
          created_at: new Date().toISOString(),
        });
      }

      const { data: newAllocations, error: allocationError } = await (
        serviceClient as any
      )
        .from("task_transport_allocations")
        .insert(transportAllocations)
        .select();

      if (allocationError) {
        console.error("Error creating allocations:", allocationError);
        return NextResponse.json(
          { error: "Failed to create allocations" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        message: "Allocations created successfully",
        task: {
          id: (task as any).id,
          title: (task as any).title,
          volume: (task as any).volume,
          rate_per_satuan: (task as any).rate_per_satuan,
          total_amount: (task as any).total_amount,
        },
        allocations_created: newAllocations?.length || 0,
        allocations: newAllocations,
      });
    } else {
      return NextResponse.json({
        error: "Task does not have satuan system data",
        task: {
          id: (task as any).id,
          title: (task as any).title,
          satuan_id: (task as any).satuan_id,
          volume: (task as any).volume,
          rate_per_satuan: (task as any).rate_per_satuan,
        },
      });
    }
  } catch (error) {
    console.error("Create Allocations API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
