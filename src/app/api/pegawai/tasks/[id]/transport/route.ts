// File: src/app/api/pegawai/tasks/[id]/transport/route.ts
// NEW: Transport allocation management for pegawai

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id: taskId } = await params;

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get available dates for transport allocation
    const { data: availableDates, error: datesError } = await supabase.rpc(
      "get_available_transport_dates",
      {
        user_id_param: user.id,
        task_id_param: taskId,
      } as never
    );

    if (datesError) {
      throw datesError;
    }

    // Get current allocation
    const { data: allocation } = await supabase
      .from("task_transport_allocations")
      .select("*")
      .eq("task_id", taskId)
      .eq("user_id", user.id)
      .single();

    return NextResponse.json({
      data: {
        available_dates: availableDates || [],
        current_allocation: allocation || null,
      },
    });
  } catch (error) {
    console.error("Transport Dates API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id: taskId } = await params;
    const { allocation_date } = await request.json();

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify task belongs to user
    interface TaskMinimal {
      id: string;
      start_date: string;
      end_date: string;
      has_transport: boolean;
    }

    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("id, start_date, end_date, has_transport")
      .eq("id", taskId)
      .eq("assignee_user_id", user.id)
      .single();

    if (taskError || !task || !(task as TaskMinimal).has_transport) {
      return NextResponse.json(
        { error: "Task not found or transport not available" },
        { status: 404 }
      );
    }

    // Validate allocation date
    const allocDate = new Date(allocation_date);
    const startDate = new Date((task as TaskMinimal).start_date);
    const endDate = new Date((task as TaskMinimal).end_date);

    if (allocDate < startDate || allocDate > endDate) {
      return NextResponse.json(
        { error: "Allocation date must be within task date range" },
        { status: 400 }
      );
    }

    // Check if date is available
    const { data: existing, error: existingError } = await supabase
      .from("task_transport_allocations")
      .select("id")
      .eq("user_id", user.id)
      .eq("allocation_date", allocation_date)
      .is("canceled_at", null)
      .single();

    if (!existingError && existing) {
      return NextResponse.json(
        { error: "You already have transport allocated for this date" },
        { status: 400 }
      );
    }

    // Update allocation with date
    type TaskTransportAllocationsUpdate =
      Database["public"]["Tables"]["task_transport_allocations"]["Update"];

    const updateData: TaskTransportAllocationsUpdate = {
      allocation_date,
    };

    const { data: allocation, error: updateError } = await supabase
      .from("task_transport_allocations")
      .update(updateData as unknown as never)
      .eq("task_id", taskId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      data: allocation,
      message: "Transport allocation date set successfully",
    });
  } catch (error) {
    console.error("Transport Allocation API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
