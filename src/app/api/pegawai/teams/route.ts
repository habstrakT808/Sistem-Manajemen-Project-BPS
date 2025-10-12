// File: src/app/api/pegawai/teams/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/../database/types/database.types";

interface TeamRow {
  id: string;
  name: string;
  description: string | null;
  leader_user_id: string | null;
  users?: { nama_lengkap: string; email: string } | null;
  role: "leader" | "member";
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use service role to avoid any RLS edge cases; strictly filter by current user
    const svc = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Fetch ALL teams
    const { data: allTeams } = await (svc as any)
      .from("teams")
      .select(
        `id, name, description, leader_user_id, users!teams_leader_user_id_fkey(nama_lengkap, email)`,
      );

    // Find teams where user is leader
    const leaderTeamIds = (allTeams || [])
      .filter((t: any) => t.leader_user_id === user.id)
      .map((t: any) => t.id);

    // Find teams where user has projects assigned (via project_members, project_assignments, or tasks)
    // Step 1: Check project_members for ALL projects
    const { data: allProjectMembers } = await (svc as any)
      .from("project_members")
      .select("project_id")
      .eq("user_id", user.id);

    // Step 2: Check project_assignments for ALL projects
    const { data: allAssignments } = await (svc as any)
      .from("project_assignments")
      .select("project_id")
      .eq("assignee_type", "pegawai")
      .eq("assignee_id", user.id);

    // Step 3: Check tasks for ALL projects
    const { data: allTasks } = await (svc as any)
      .from("tasks")
      .select("project_id")
      .or(`assignee_user_id.eq.${user.id},pegawai_id.eq.${user.id}`);

    // Collect unique project IDs where user is assigned
    const assignedProjectIds = new Set([
      ...(allProjectMembers || []).map((m: any) => m.project_id),
      ...(allAssignments || []).map((a: any) => a.project_id),
      ...(allTasks || []).map((t: any) => t.project_id),
    ]);

    // Get projects with their team_id for assigned projects
    const { data: userProjects } = await (svc as any)
      .from("projects")
      .select("id, team_id")
      .in(
        "id",
        assignedProjectIds.size > 0
          ? Array.from(assignedProjectIds)
          : ["__none__"],
      )
      .not("team_id", "is", null);

    // Get team IDs from assigned projects
    const memberTeamIds = (userProjects || [])
      .filter((p: any) => p.team_id)
      .map((p: any) => p.team_id);

    // Combine leader teams and member teams
    const relevantTeamIds = new Set([...leaderTeamIds, ...memberTeamIds]);

    // Filter teams to only show relevant ones
    const merged: TeamRow[] = ((allTeams || []) as any[])
      .filter((t: any) => relevantTeamIds.has(t.id))
      .map((t: any) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        leader_user_id: t.leader_user_id,
        users: t.users || null,
        role:
          (t.leader_user_id as string | null) === (user.id as unknown as string)
            ? ("leader" as const)
            : ("member" as const),
      }));

    return NextResponse.json({ data: merged });
  } catch (e) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
