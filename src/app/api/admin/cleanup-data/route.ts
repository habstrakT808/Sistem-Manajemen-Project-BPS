import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role validation - only admin can cleanup data
    const { data: userProfile, error: profileError } = await serviceClient
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !userProfile || (userProfile as any).role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Clean up project_members entries that don't have corresponding tasks
    const { data: allProjectMembers } = await serviceClient
      .from("project_members")
      .select("project_id, user_id");

    const { data: allTasks } = await serviceClient
      .from("tasks")
      .select("project_id, assignee_user_id");

    // Create a set of valid project-user combinations from tasks
    const validProjectUserCombinations = new Set();
    (allTasks || []).forEach(
      (task: { project_id: string; assignee_user_id: string }) => {
        validProjectUserCombinations.add(
          `${task.project_id}-${task.assignee_user_id}`,
        );
      },
    );

    // Find invalid project_members entries
    const invalidProjectMembers = (allProjectMembers || []).filter(
      (member: { project_id: string; user_id: string }) => {
        const key = `${member.project_id}-${member.user_id}`;
        return !validProjectUserCombinations.has(key);
      },
    );

    console.log(
      "Found",
      invalidProjectMembers.length,
      "invalid project_members entries",
    );

    // Delete invalid project_members entries
    let deletedCount = 0;
    for (const member of invalidProjectMembers) {
      const { error: deleteError } = await serviceClient
        .from("project_members")
        .delete()
        .eq("project_id", member.project_id)
        .eq("user_id", member.user_id);

      if (!deleteError) {
        deletedCount++;
      } else {
        console.error("Error deleting project_member:", deleteError);
      }
    }

    return NextResponse.json({
      message: "Data cleanup completed",
      deleted_project_members: deletedCount,
      total_invalid_entries: invalidProjectMembers.length,
    });
  } catch (error) {
    console.error("Data cleanup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
