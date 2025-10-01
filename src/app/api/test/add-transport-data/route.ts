import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function POST(_request: NextRequest) {
  try {
    console.log("🔍 [DEBUG] Adding test transport data...");

    // Use service client to bypass RLS
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // First, let's find an existing user instead of creating one
    const { data: existingUsers } = await supabase
      .from("users")
      .select("id, nama_lengkap, role")
      .eq("role", "pegawai")
      .eq("is_active", true)
      .limit(1);

    if (!existingUsers || existingUsers.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No existing pegawai users found. Please create a user first through the admin panel.",
          debug: {
            message: "Cannot create test data without existing users",
          },
        },
        { status: 400 },
      );
    }

    const testUser = existingUsers[0];
    const testUserId = testUser.id;
    const testProjectId = "11111111-1111-1111-1111-111111111111";

    console.log(
      "🔍 [DEBUG] Using existing user:",
      testUser.nama_lengkap,
      "ID:",
      testUserId,
    );

    // 1. Create test project
    console.log("🔍 [DEBUG] Creating test project...");
    const { error: projectError } = await supabase.from("projects").upsert({
      id: testProjectId,
      nama_project: "Test Project for Transport",
      deskripsi: "A test project to verify transport allocation functionality",
      tanggal_mulai: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0], // 10 days ago
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0], // 30 days from now
      ketua_tim_id: testUserId,
      leader_user_id: testUserId,
      status: "active",
    });

    if (projectError) {
      console.error("Error creating test project:", projectError);
      throw projectError;
    }

    // 2. Create test tasks
    console.log("🔍 [DEBUG] Creating test tasks...");
    const tasks = [
      {
        id: "22222222-2222-2222-2222-222222222222",
        project_id: testProjectId,
        pegawai_id: testUserId,
        assignee_user_id: testUserId,
        title: "Task with Pending Transport",
        deskripsi_tugas: "This task has pending transport allocations",
        tanggal_tugas: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0], // 2 days from now
        start_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0], // 2 days from now
        end_date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0], // 4 days from now
        has_transport: true,
        transport_days: 3,
        status: "pending",
      },
      {
        id: "33333333-3333-3333-3333-333333333333",
        project_id: testProjectId,
        pegawai_id: testUserId,
        assignee_user_id: testUserId,
        title: "Task with Allocated Transport",
        deskripsi_tugas: "This task has allocated transport",
        tanggal_tugas: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0], // 5 days from now
        start_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0], // 5 days from now
        end_date: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0], // 6 days from now
        has_transport: true,
        transport_days: 2,
        status: "pending",
      },
    ];

    const { error: tasksError } = await supabase.from("tasks").upsert(tasks);

    if (tasksError) {
      console.error("Error creating test tasks:", tasksError);
      throw tasksError;
    }

    // 3. Create transport allocations
    console.log("🔍 [DEBUG] Creating transport allocations...");
    const allocations = [
      // Pending allocations (not yet allocated to specific dates)
      {
        id: "44444444-4444-4444-4444-444444444444",
        task_id: "22222222-2222-2222-2222-222222222222",
        user_id: testUserId,
        amount: 150000,
        allocation_date: null,
        allocated_at: null,
        canceled_at: null,
      },
      {
        id: "55555555-5555-5555-5555-555555555555",
        task_id: "22222222-2222-2222-2222-222222222222",
        user_id: testUserId,
        amount: 150000,
        allocation_date: null,
        allocated_at: null,
        canceled_at: null,
      },
      {
        id: "66666666-6666-6666-6666-666666666666",
        task_id: "22222222-2222-2222-2222-222222222222",
        user_id: testUserId,
        amount: 150000,
        allocation_date: null,
        allocated_at: null,
        canceled_at: null,
      },
      // Allocated allocations (with specific dates)
      {
        id: "77777777-7777-7777-7777-777777777777",
        task_id: "33333333-3333-3333-3333-333333333333",
        user_id: testUserId,
        amount: 150000,
        allocation_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0], // 5 days from now
        allocated_at: new Date().toISOString(),
        canceled_at: null,
      },
      {
        id: "88888888-8888-8888-8888-888888888888",
        task_id: "33333333-3333-3333-3333-333333333333",
        user_id: testUserId,
        amount: 150000,
        allocation_date: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0], // 6 days from now
        allocated_at: new Date().toISOString(),
        canceled_at: null,
      },
    ];

    const { error: allocationsError } = await supabase
      .from("task_transport_allocations")
      .upsert(allocations);

    if (allocationsError) {
      console.error("Error creating transport allocations:", allocationsError);
      throw allocationsError;
    }

    // 4. Get summary
    const { data: summary } = await supabase
      .from("task_transport_allocations")
      .select("id, allocated_at, canceled_at")
      .eq("user_id", testUserId);

    const totalAllocations = summary?.length || 0;
    const pendingAllocations =
      summary?.filter((a) => !a.allocated_at && !a.canceled_at).length || 0;
    const allocatedAllocations =
      summary?.filter((a) => a.allocated_at && !a.canceled_at).length || 0;

    console.log("🔍 [DEBUG] Test data created successfully!");
    console.log("🔍 [DEBUG] Summary:", {
      totalAllocations,
      pendingAllocations,
      allocatedAllocations,
    });

    return NextResponse.json({
      success: true,
      message: "Test transport data created successfully",
      summary: {
        totalAllocations,
        pendingAllocations,
        allocatedAllocations,
        testUserId,
        testUserName: testUser.nama_lengkap,
        testProjectId,
      },
    });
  } catch (error) {
    console.error("🔍 [DEBUG] Error adding test data:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        debug: {
          message: "Failed to add test transport data",
        },
      },
      { status: 500 },
    );
  }
}
