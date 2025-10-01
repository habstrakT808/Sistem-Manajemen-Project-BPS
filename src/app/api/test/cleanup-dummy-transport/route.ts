import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function POST(_request: NextRequest) {
  try {
    console.log("🧹 [CLEANUP] Dummy transport data cleanup API called!");

    // Use service client to bypass RLS
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Find dummy tasks by title
    const { data: dummyTasks, error: tasksError } = await supabase
      .from("tasks")
      .select("id, title")
      .or(
        "title.eq.Task with Allocated Transport,title.eq.Task with Pending Transport",
      );

    if (tasksError) {
      console.error("🧹 [CLEANUP] Error fetching dummy tasks:", tasksError);
      throw tasksError;
    }

    console.log("🧹 [CLEANUP] Found dummy tasks:", dummyTasks?.length || 0);

    if (!dummyTasks || dummyTasks.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No dummy transport tasks found",
        deleted_count: 0,
      });
    }

    const taskIds = dummyTasks.map((task) => task.id);

    // Get all transport allocations for dummy tasks
    const { data: allocations, error: allocationsError } = await supabase
      .from("task_transport_allocations")
      .select("id, task_id")
      .in("task_id", taskIds);

    if (allocationsError) {
      console.error(
        "🧹 [CLEANUP] Error fetching allocations:",
        allocationsError,
      );
      throw allocationsError;
    }

    console.log("🧹 [CLEANUP] Found allocations:", allocations?.length || 0);

    // Delete transport allocations
    if (allocations && allocations.length > 0) {
      const { error: deleteAllocationsError } = await supabase
        .from("task_transport_allocations")
        .delete()
        .in("task_id", taskIds);

      if (deleteAllocationsError) {
        console.error(
          "🧹 [CLEANUP] Error deleting allocations:",
          deleteAllocationsError,
        );
        throw deleteAllocationsError;
      }

      // Delete related earnings ledger entries
      const allocationIds = allocations.map((a) => a.id);
      const { error: earningsDeleteError } = await supabase
        .from("earnings_ledger")
        .delete()
        .eq("type", "transport")
        .in("source_id", allocationIds);

      if (earningsDeleteError) {
        console.error(
          "🧹 [CLEANUP] Error deleting earnings:",
          earningsDeleteError,
        );
        // Don't throw here, just log the error
      }
    }

    // Delete dummy tasks
    const { error: deleteTasksError } = await supabase
      .from("tasks")
      .delete()
      .in("id", taskIds);

    if (deleteTasksError) {
      console.error("🧹 [CLEANUP] Error deleting tasks:", deleteTasksError);
      throw deleteTasksError;
    }

    // Delete dummy project if exists
    const { data: dummyProject, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("nama_project", "Test Project for Transport");

    if (!projectError && dummyProject && dummyProject.length > 0) {
      const { error: deleteProjectError } = await supabase
        .from("projects")
        .delete()
        .eq("id", dummyProject[0].id);

      if (deleteProjectError) {
        console.error(
          "🧹 [CLEANUP] Error deleting dummy project:",
          deleteProjectError,
        );
      }
    }

    console.log(
      "🧹 [CLEANUP] Successfully deleted",
      dummyTasks.length,
      "dummy tasks and",
      allocations?.length || 0,
      "transport allocations",
    );

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${dummyTasks.length} dummy tasks and ${allocations?.length || 0} transport allocations`,
      deleted_tasks: dummyTasks,
      deleted_allocations_count: allocations?.length || 0,
    });
  } catch (error) {
    console.error("🧹 [CLEANUP] Dummy transport cleanup error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to cleanup dummy transport data",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message:
      "Use POST method to cleanup dummy transport data (Task with Allocated Transport, Task with Pending Transport)",
  });
}
