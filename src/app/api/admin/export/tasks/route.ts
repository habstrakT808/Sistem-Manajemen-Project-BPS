import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: userProfile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!userProfile || (userProfile as { role: string }).role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get projectId from query params
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 },
      );
    }

    // Use service client to bypass RLS and avoid infinite recursion
    const svc = await createServiceRoleClient();

    // Fetch tasks for the project
    const { data: tasks, error: tasksError } = await (svc as any)
      .from("tasks")
      .select("id, title, project_id, assignee_user_id, assignee_mitra_id")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });

    if (tasksError) {
      throw tasksError;
    }

    // Add assignee_type based on which field is filled
    const tasksWithType = (tasks || []).map((task: any) => ({
      ...task,
      assignee_type: task.assignee_mitra_id ? "mitra" : "pegawai",
    }));

    return NextResponse.json(tasksWithType);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
