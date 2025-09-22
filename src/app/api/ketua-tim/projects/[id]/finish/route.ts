import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createClient()) as any;
    const { id: projectId } = await params;

    // Auth: must be ketua_tim
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("role, nama_lengkap")
      .eq("id", user.id)
      .single();

    if (profileError || !userProfile) {
      console.error("Profile error:", profileError);
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    const userRole = (userProfile as { role: string }).role;
    console.log("User role:", userRole, "User ID:", user.id);

    // Allow both ketua_tim role and pegawai users (they will be checked for project leadership later)
    if (userRole !== "ketua_tim" && userRole !== "pegawai") {
      console.error(
        "User role not allowed:",
        userRole,
        "Expected: ketua_tim or pegawai"
      );
      return NextResponse.json(
        { error: "Forbidden - Invalid role" },
        { status: 403 }
      );
    }

    // Use service client to bypass RLS for project query
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Ensure the project belongs to this ketua tim and is not already completed
    const { data: project, error: projectError } = await serviceClient
      .from("projects")
      .select("id, status, leader_user_id, ketua_tim_id")
      .eq("id", projectId)
      .or(`leader_user_id.eq.${user.id},ketua_tim_id.eq.${user.id}`)
      .single();

    if (projectError || !project) {
      console.error("Project error:", projectError);
      console.log("Project ID:", projectId, "User ID:", user.id);
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    console.log("Project found:", project);

    // Check if user is the leader of this project
    const isLeader =
      project.leader_user_id === user.id || project.ketua_tim_id === user.id;
    if (!isLeader) {
      console.error("User is not the leader of this project");
      console.log("Project leader_user_id:", project.leader_user_id);
      console.log("Project ketua_tim_id:", project.ketua_tim_id);
      console.log("Current user ID:", user.id);
      return NextResponse.json(
        { error: "You are not the leader of this project" },
        { status: 403 }
      );
    }

    if (project.status === "completed") {
      return NextResponse.json(
        { message: "Project is already completed" },
        { status: 200 }
      );
    }

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const todayStr = `${yyyy}-${mm}-${dd}`;

    // 1) Update project status to completed and set deadline to today
    const { error: updateProjectError } = await serviceClient
      .from("projects")
      .update({
        status: "completed",
        deadline: todayStr,
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId)
      .or(`leader_user_id.eq.${user.id},ketua_tim_id.eq.${user.id}`);

    if (updateProjectError) {
      throw updateProjectError;
    }

    // 2) Mark all non-completed tasks in this project as completed
    const { error: updateTasksError } = await serviceClient
      .from("tasks")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("project_id", projectId)
      .neq("status", "completed");

    if (updateTasksError) {
      // Log but do not fail entirely; partial success still marks project done
      console.error("Failed to complete remaining tasks:", updateTasksError);
    }

    // Note: Pegawai schedule derives from tasks and project date span.
    // Setting project deadline to today + completing tasks will immediately reflect in schedule APIs.

    return NextResponse.json({ message: "Project marked as completed" });
  } catch (error) {
    console.error("Finish project error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
