// File: src/app/api/pegawai/team-projects/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/../database/types/database.types";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const svc = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("team_id");
    if (!teamId) {
      return NextResponse.json({ error: "Missing team_id" }, { status: 400 });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Projects linked to this team (use service role to avoid recursive RLS)
    const { data: teamProjects, error: projErr } = await (svc as any)
      .from("projects")
      .select(
        "id, nama_project, deskripsi, status, tanggal_mulai, deadline, leader_user_id, team_id",
      )
      .eq("team_id", teamId);
    if (projErr) throw projErr;

    // Determine user's role in each project
    const projectIds = (teamProjects || []).map((p: any) => p.id);
    type PM = { project_id: string; role: string };
    const { data: members } = await (svc as any)
      .from("project_members")
      .select("project_id, role")
      .eq("user_id", user.id)
      .in("project_id", projectIds.length > 0 ? projectIds : ["__none__"]);

    const roleByProject: Record<string, string> = {};
    (members as PM[] | null)?.forEach(
      (m) => (roleByProject[m.project_id] = m.role),
    );

    // Return ALL projects under this team; user-level scoping will be enforced by
    // downstream pages/APIs (tasks/dashboard already filter by assignee).
    const data = (teamProjects || []).map((p: any) => ({
      id: p.id,
      nama_project: p.nama_project,
      deskripsi: p.deskripsi,
      status: p.status,
      tanggal_mulai: p.tanggal_mulai,
      deadline: p.deadline,
      user_role:
        p.leader_user_id === user.id
          ? "leader"
          : roleByProject[p.id] || "member",
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Team Projects API error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
