import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function GET(_request: NextRequest) {
  try {
    console.log("🔍 [DEBUG] Checking tasks with transport and honor...");

    // Use service client to bypass RLS
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Check tasks with transport
    const { data: transportTasks } = await supabase
      .from("tasks")
      .select("id, title, project_id, has_transport, transport_days")
      .eq("has_transport", true);

    // Check tasks with honor
    const { data: honorTasks } = await supabase
      .from("tasks")
      .select("id, title, project_id, honor_amount, assignee_user_id")
      .not("honor_amount", "is", null)
      .gt("honor_amount", 0);

    // Check projects
    const { data: projects } = await supabase
      .from("projects")
      .select("id, nama_project, status")
      .eq("status", "active");

    // Check transport allocations
    const { data: transportAllocations } = await supabase
      .from("task_transport_allocations")
      .select("*")
      .limit(10);

    return NextResponse.json({
      success: true,
      data: {
        transportTasks: transportTasks || [],
        honorTasks: honorTasks || [],
        projects: projects || [],
        transportAllocations: transportAllocations || [],
        summary: {
          transportTasksCount: transportTasks?.length || 0,
          honorTasksCount: honorTasks?.length || 0,
          projectsCount: projects?.length || 0,
          transportAllocationsCount: transportAllocations?.length || 0,
        },
      },
    });
  } catch (error) {
    console.error("🔍 [DEBUG] Error checking tasks:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
