import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function GET(_request: NextRequest) {
  try {
    console.log("🔍 [DEBUG] Checking projects and ownership...");

    // Use service client to bypass RLS
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Check projects with their owners
    const { data: projects } = await supabase
      .from("projects")
      .select(
        `
        id, 
        nama_project, 
        status, 
        ketua_tim_id, 
        leader_user_id,
        users!projects_ketua_tim_id_fkey(nama_lengkap, email, role),
        leader:users!projects_leader_user_id_fkey(nama_lengkap, email, role)
      `,
      )
      .eq("status", "active");

    // Check tasks for these projects
    const projectIds = projects?.map((p) => p.id) || [];
    const { data: tasks } = await supabase
      .from("tasks")
      .select(
        "id, title, project_id, has_transport, transport_days, honor_amount",
      )
      .in("project_id", projectIds);

    return NextResponse.json({
      success: true,
      data: {
        projects: projects || [],
        tasks: tasks || [],
        summary: {
          projectsCount: projects?.length || 0,
          tasksCount: tasks?.length || 0,
          transportTasks: tasks?.filter((t) => t.has_transport) || [],
          honorTasks:
            tasks?.filter((t) => t.honor_amount && t.honor_amount > 0) || [],
        },
      },
    });
  } catch (error) {
    console.error("🔍 [DEBUG] Error checking projects:", error);
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
