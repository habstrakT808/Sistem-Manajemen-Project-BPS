// File: src/app/api/admin/teams/route.ts
// UPDATED: Complete team management API

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/../database/types/database.types";

interface UserProfile {
  role: string;
}

// TeamRecord kept loose to avoid strict coupling with DB types in selects
type TeamRecord = Record<string, unknown> & { id: string };

interface CreateTeamData {
  name: string;
  description?: string;
  leader_user_id?: string;
}

interface UpdateTeamData {
  id: string;
  name?: string;
  description?: string | null;
  leader_user_id?: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body: CreateTeamData = await request.json();

    // Auth check - admin only
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
      (userProfile as UserProfile).role !== "admin"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate leader if provided (must be an active pegawai)
    if (body.leader_user_id) {
      const { data: leader, error: leaderError } = await supabase
        .from("users")
        .select("id, role, is_active")
        .eq("id", body.leader_user_id)
        .eq("role", "pegawai")
        .eq("is_active", true)
        .single();

      if (leaderError || !leader) {
        return NextResponse.json(
          { error: "Invalid leader - must be an active pegawai" },
          { status: 400 }
        );
      }
    }

    // Use service role to bypass RLS recursion when touching teams
    const supabaseAdmin = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Create team
    const { data: team, error: teamError } = await supabaseAdmin
      .from("teams")
      .insert({
        name: body.name,
        description: body.description,
        leader_user_id: body.leader_user_id,
        created_by: user.id,
      } as never)
      .select(
        `
        id,
        name,
        description,
        leader_user_id,
        created_at,
        users!teams_leader_user_id_fkey (nama_lengkap, email)
      `
      )
      .single();

    if (teamError) {
      throw teamError;
    }

    // Log audit trail
    await supabaseAdmin.from("audit_logs").insert({
      actor_user_id: user.id,
      action: "CREATE",
      entity: "teams",
      entity_id: (team as TeamRecord).id,
      after_data: team,
    } as never);

    return NextResponse.json({
      data: team,
      message: "Team created successfully",
    });
  } catch (error) {
    console.error("Team Creation API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = await createClient();

    // Auth check - admin only
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
      (userProfile as UserProfile).role !== "admin"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Use service role to fetch teams to avoid RLS recursive evaluation
    const supabaseAdmin = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get all teams
    const { data: teams, error: teamsError } = await supabaseAdmin
      .from("teams")
      .select(
        `
        id,
        name,
        description,
        leader_user_id,
        created_at,
        updated_at,
        users!teams_leader_user_id_fkey (nama_lengkap, email)
      `
      )
      .order("created_at", { ascending: false });

    if (teamsError) {
      throw teamsError;
    }

    // Compute counts using separate queries to avoid recursive policies
    const teamIds = (teams || []).map((t: TeamRecord) => t.id);

    // Members per team
    const teamMemberCounts = new Map<string, number>();
    if (teamIds.length > 0) {
      const { data: members } = await supabaseAdmin
        .from("team_members")
        .select("team_id")
        .in("team_id", teamIds as unknown as string[]);
      (members || []).forEach((m) => {
        const id = (m as { team_id: string }).team_id;
        teamMemberCounts.set(id, (teamMemberCounts.get(id) || 0) + 1);
      });
    }

    // Projects per team
    const teamProjectCounts = new Map<string, number>();
    if (teamIds.length > 0) {
      const { data: projects } = await supabaseAdmin
        .from("projects")
        .select("team_id")
        .in("team_id", teamIds as unknown as string[]);
      (projects || []).forEach((p) => {
        const id = (p as { team_id: string | null }).team_id as string;
        teamProjectCounts.set(id, (teamProjectCounts.get(id) || 0) + 1);
      });
    }

    const safeTeams = (teams || []).map((team: TeamRecord) => ({
      ...team,
      project_count: teamProjectCounts.get(team.id) || 0,
      total_members: teamMemberCounts.get(team.id) || 0,
    }));

    return NextResponse.json({
      data: safeTeams,
    });
  } catch (error) {
    console.error("Teams Fetch API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body: UpdateTeamData = await request.json();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userProfile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!userProfile || (userProfile as UserProfile).role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabaseAdmin = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const updatePayload: {
      name?: string;
      description?: string | null;
      leader_user_id?: string | null;
      updated_at?: string;
      updated_by?: string;
    } = {
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    };
    if (body.name !== undefined) updatePayload.name = body.name;
    if (body.description !== undefined)
      updatePayload.description = body.description;
    if (body.leader_user_id !== undefined)
      updatePayload.leader_user_id = body.leader_user_id;

    const { error } = await supabaseAdmin
      .from("teams")
      .update(updatePayload as never)
      .eq("id", body.id);
    if (error) throw error;

    return NextResponse.json({ message: "Team updated" });
  } catch (error) {
    console.error("Team Update API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userProfile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!userProfile || (userProfile as UserProfile).role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabaseAdmin = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Safety: detach leader references from projects to avoid FK constraints
    const projectUpdate: { team_id: null; leader_user_id: null } = {
      team_id: null,
      leader_user_id: null,
    };
    await supabaseAdmin
      .from("projects")
      .update(projectUpdate as never)
      .eq("team_id", id as string);

    const { error } = await supabaseAdmin
      .from("teams")
      .delete()
      .eq("id", id as string);
    if (error) throw error;

    return NextResponse.json({ message: "Team deleted" });
  } catch (error) {
    console.error("Team Delete API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
