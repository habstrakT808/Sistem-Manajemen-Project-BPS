import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !userProfile ||
      (userProfile as { role: string }).role !== "ketua_tim"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Ensure the project belongs to this ketua tim and is not already completed
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, status")
      .eq("id", projectId)
      .eq("ketua_tim_id", user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
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
    const { error: updateProjectError } = await supabase
      .from("projects")
      .update({
        status: "completed",
        deadline: todayStr,
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId)
      .eq("ketua_tim_id", user.id);

    if (updateProjectError) {
      throw updateProjectError;
    }

    // 2) Mark all non-completed tasks in this project as completed
    const { error: updateTasksError } = await supabase
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
