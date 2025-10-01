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

    // Always include teams where this user is leader
    const { data: leaderTeams } = await (svc as any)
      .from("teams")
      .select(
        `id, name, description, leader_user_id, users!teams_leader_user_id_fkey(nama_lengkap, email)`,
      )
      .eq("leader_user_id", user.id as unknown as string);

    // Teams as member via membership (STRICT: only role='member')
    const { data: memberProjects } = await (svc as any)
      .from("project_members")
      .select("project_id, role")
      .eq("user_id", user.id as unknown as string)
      .eq("role", "member");

    const memberOnlyProjectIds = (memberProjects || [])
      .filter((p: { role?: string }) => (p as any).role === "member")
      .map((p: { project_id: string }) => p.project_id);

    // Fallback: derive from project_assignments if no member-only rows yet
    let assignmentProjectIds: string[] = [];
    if (memberOnlyProjectIds.length === 0) {
      const { data: paRows } = await (svc as any)
        .from("project_members")
        .select("project_id")
        .eq("user_id", user.id as unknown as string);
      assignmentProjectIds = (paRows || []).map(
        (r: { project_id: string }) => r.project_id,
      );
    }

    const allMemberProjectIds = Array.from(
      new Set([...(memberOnlyProjectIds || []), ...assignmentProjectIds]),
    );

    // Fetch teams ONLY for projects that are associated with a real team (team_id not null)
    const { data: memberTeams } = await (svc as any)
      .from("projects")
      .select("id, team_id")
      .in(
        "id",
        allMemberProjectIds.length > 0 ? allMemberProjectIds : ["__none__"],
      )
      .not("team_id", "is", null);

    const teamIds = Array.from(
      new Set(
        (memberTeams || [])
          .map((p: { team_id: string | null }) => p.team_id)
          .filter((id: string | null) => Boolean(id)),
      ),
    ) as string[];

    // Real team rows (only existing team ids)
    const { data: teamRows } = await (svc as any)
      .from("teams")
      .select(
        `id, name, description, leader_user_id, users!teams_leader_user_id_fkey(nama_lengkap, email)`,
      )
      .in("id", teamIds.length > 0 ? teamIds : ["__none__"]);

    const leaderSet = new Set((leaderTeams || []).map((t: any) => t.id));
    const merged: TeamRow[] = [
      ...((leaderTeams || []).map((t: any) => ({
        ...t,
        role: "leader" as const,
      })) as TeamRow[]),
      ...((teamRows || [])
        .filter((t: any) => !leaderSet.has(t.id))
        .map((t: any) => ({ ...t, role: "member" as const })) as TeamRow[]),
    ];

    return NextResponse.json({ data: merged });
  } catch (e) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
