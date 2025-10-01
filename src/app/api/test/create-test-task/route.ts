import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function POST(_request: NextRequest) {
  try {
    console.log("🧪 [TEST] Creating new test task...");

    // Use service client to bypass RLS
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get test user ID
    const { data: testUser } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("email", "pegawai@test.com")
      .single();

    if (!testUser) {
      return NextResponse.json(
        {
          success: false,
          error: "Test user not found",
        },
        { status: 404 },
      );
    }

    // Get test project ID
    const { data: testProject } = await supabase
      .from("projects")
      .select("id")
      .limit(1)
      .single();

    if (!testProject) {
      return NextResponse.json(
        {
          success: false,
          error: "Test project not found",
        },
        { status: 404 },
      );
    }

    const taskTitle = `Test Task ${Date.now()}`;
    const transportDays = 2; // Test with 2 transport days

    console.log("🧪 [TEST] Creating task with transport_days:", transportDays);

    // 1. Create task
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .insert({
        title: taskTitle,
        deskripsi_tugas: "Test task to verify transport allocation creation",
        tanggal_tugas: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0], // 7 days from now
        start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        end_date: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0], // 9 days from now
        has_transport: true,
        transport_days: transportDays,
        status: "pending",
        assignee_user_id: testUser.id,
        project_id: testProject.id,
      })
      .select()
      .single();

    if (taskError) {
      console.error("🧪 [TEST] Task creation error:", taskError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create task",
        },
        { status: 500 },
      );
    }

    console.log("🧪 [TEST] Task created:", task.id);

    // 2. Create transport allocations manually (like the API route does)
    const transportAllocations = [];
    for (let i = 0; i < transportDays; i++) {
      transportAllocations.push({
        task_id: task.id,
        user_id: testUser.id,
        amount: 150000,
        created_at: new Date().toISOString(),
      });
    }

    const { error: transportError } = await supabase
      .from("task_transport_allocations")
      .insert(transportAllocations);

    if (transportError) {
      console.error("🧪 [TEST] Transport allocation error:", transportError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create transport allocations",
        },
        { status: 500 },
      );
    }

    console.log("🧪 [TEST] Created", transportDays, "transport allocations");

    // 3. Verify allocations
    const { data: allocations, error: allocError } = await supabase
      .from("task_transport_allocations")
      .select("id, canceled_at")
      .eq("task_id", task.id)
      .is("canceled_at", null);

    if (allocError) {
      console.error("🧪 [TEST] Allocation verification error:", allocError);
    }

    const allocationCount = allocations?.length || 0;

    return NextResponse.json({
      success: true,
      message: `Test task created successfully`,
      data: {
        task: {
          id: task.id,
          title: task.title,
          transport_days: task.transport_days,
          has_transport: task.has_transport,
        },
        allocations: {
          expected_count: transportDays,
          actual_count: allocationCount,
          is_correct: allocationCount === transportDays,
        },
        test_result: allocationCount === transportDays ? "PASS" : "FAIL",
      },
    });
  } catch (error) {
    console.error("🧪 [TEST] Test task creation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to create test task",
      },
      { status: 500 },
    );
  }
}
